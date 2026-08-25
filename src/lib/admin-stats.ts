import "server-only";
import { db } from "@/lib/db";
import type { OrderStatus } from "@/generated/prisma/enums";

const REVENUE_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

export async function getDashboardStats() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start30 = new Date(startOfToday);
  start30.setDate(start30.getDate() - 29);

  const [today, last30, pending, allTime, lowStock, recentOrders, topItems] = await Promise.all([
    db.order.aggregate({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: startOfToday } },
      _sum: { totalCents: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: start30 } },
      _sum: { totalCents: true },
      _count: true,
    }),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.aggregate({ where: { status: { in: REVENUE_STATUSES } }, _sum: { totalCents: true }, _count: true }),
    db.$queryRaw<{ id: string; name: string; stock: number; lowStockAlert: number; productName: string; slug: string }[]>`
      SELECT v.id, v.name, v.stock, v."lowStockAlert", p.name AS "productName", p.slug
      FROM "ProductVariant" v
      JOIN "Product" p ON p.id = v."productId"
      WHERE v.active = true AND p.active = true AND v.stock <= v."lowStockAlert"
      ORDER BY v.stock ASC
      LIMIT 12
    `,
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { items: { select: { quantity: true } } },
    }),
    db.orderItem.groupBy({
      by: ["productName"],
      where: { order: { status: { in: REVENUE_STATUSES } } },
      _sum: { quantity: true, totalCents: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const avgTicket = allTime._count > 0 ? Math.round((allTime._sum.totalCents ?? 0) / allTime._count) : 0;

  return {
    todayRevenue: today._sum.totalCents ?? 0,
    todayOrders: today._count,
    monthRevenue: last30._sum.totalCents ?? 0,
    monthOrders: last30._count,
    pendingOrders: pending,
    avgTicket,
    lowStock,
    recentOrders,
    topItems,
  };
}
