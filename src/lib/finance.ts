import "server-only";
import { db } from "@/lib/db";
import { previousPeriod, type Period } from "@/lib/finance-period";
import { STORE_TIME_ZONE } from "@/lib/utils";
import type { OrderStatus, PaymentMethod } from "@/generated/prisma/enums";

/**
 * Só pedido confirmado entra no financeiro — o mesmo critério do dashboard.
 * PENDING fica de fora (vira "a receber") e CANCELED some.
 */
const REVENUE_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];
/// Literal para o SQL cru: a mesma lista, escrita à mão porque é constante.
const REVENUE_SQL = `'PAID','SHIPPED','DELIVERED'`;

type Totals = {
  orders: number;
  revenue: number;
  subtotal: number;
  discount: number;
  shipping: number;
  cost: number;
  /**
   * Ajuste manual no fechamento: o admin pode reescrever o `totalCents` na
   * hora de confirmar (desconto do WhatsApp, taxa extra). Positivo aumentou.
   */
  adjustment: number;
  /** O que entrou pela mercadoria: total recebido menos o frete. */
  merchandise: number;
  profit: number;
  margin: number;
  units: number;
  /** Unidades vendidas cujo produto não tem custo cadastrado. */
  unitsWithoutCost: number;
  avgTicket: number;
};

function buildTotals(
  orders: { count: number; revenue: number; subtotal: number; discount: number; shipping: number },
  items: { cost: number; units: number; unitsWithoutCost: number },
): Totals {
  // O faturamento é o `totalCents`, que o admin pode ter editado — então o
  // lucro sai dele, não do subtotal dos itens, senão um desconto dado no
  // fechamento sumiria da conta.
  const merchandise = orders.revenue - orders.shipping;
  const adjustment = merchandise - (orders.subtotal - orders.discount);
  const profit = merchandise - items.cost;
  return {
    orders: orders.count,
    revenue: orders.revenue,
    subtotal: orders.subtotal,
    discount: orders.discount,
    shipping: orders.shipping,
    cost: items.cost,
    adjustment,
    merchandise,
    profit,
    margin: merchandise > 0 ? profit / merchandise : 0,
    units: items.units,
    unitsWithoutCost: items.unitsWithoutCost,
    avgTicket: orders.count > 0 ? Math.round(orders.revenue / orders.count) : 0,
  };
}

async function ordersTotals(start: Date, end: Date) {
  const agg = await db.order.aggregate({
    where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: start, lt: end } },
    _sum: { totalCents: true, subtotalCents: true, discountCents: true, shippingCents: true },
    _count: true,
  });
  return {
    count: agg._count,
    revenue: agg._sum.totalCents ?? 0,
    subtotal: agg._sum.subtotalCents ?? 0,
    discount: agg._sum.discountCents ?? 0,
    shipping: agg._sum.shippingCents ?? 0,
  };
}

/**
 * O custo vem do produto de hoje (`Product.costCents`), não de um snapshot no
 * item — o pedido não guarda custo. Mudar o custo de um produto, portanto,
 * reescreve o lucro do histórico dele.
 */
async function itemsTotals(start: Date, end: Date) {
  const [row] = await db.$queryRawUnsafe<
    { cost: bigint; units: bigint; units_without_cost: bigint }[]
  >(
    `SELECT COALESCE(SUM(oi.quantity * COALESCE(p."costCents", 0)), 0)::bigint AS cost,
            COALESCE(SUM(oi.quantity), 0)::bigint AS units,
            COALESCE(SUM(CASE WHEN p."costCents" IS NULL THEN oi.quantity ELSE 0 END), 0)::bigint
              AS units_without_cost
       FROM "OrderItem" oi
       JOIN "Order" o ON o.id = oi."orderId"
       LEFT JOIN "Product" p ON p.id = oi."productId"
      WHERE o.status IN (${REVENUE_SQL}) AND o."createdAt" >= $1 AND o."createdAt" < $2`,
    start,
    end,
  );
  return {
    cost: Number(row?.cost ?? 0),
    units: Number(row?.units ?? 0),
    unitsWithoutCost: Number(row?.units_without_cost ?? 0),
  };
}

/** Faturamento e custo agrupados por dia da loja (não por dia UTC). */
async function dailySeries(start: Date, end: Date) {
  const [revenueRows, costRows] = await Promise.all([
    db.$queryRawUnsafe<{ day: string; orders: bigint; revenue: bigint; net: bigint }[]>(
      `SELECT to_char(o."createdAt" AT TIME ZONE '${STORE_TIME_ZONE}', 'YYYY-MM-DD') AS day,
              COUNT(*)::bigint AS orders,
              SUM(o."totalCents")::bigint AS revenue,
              SUM(o."totalCents" - o."shippingCents")::bigint AS net
         FROM "Order" o
        WHERE o.status IN (${REVENUE_SQL}) AND o."createdAt" >= $1 AND o."createdAt" < $2
        GROUP BY 1`,
      start,
      end,
    ),
    db.$queryRawUnsafe<{ day: string; cost: bigint }[]>(
      `SELECT to_char(o."createdAt" AT TIME ZONE '${STORE_TIME_ZONE}', 'YYYY-MM-DD') AS day,
              SUM(oi.quantity * COALESCE(p."costCents", 0))::bigint AS cost
         FROM "OrderItem" oi
         JOIN "Order" o ON o.id = oi."orderId"
         LEFT JOIN "Product" p ON p.id = oi."productId"
        WHERE o.status IN (${REVENUE_SQL}) AND o."createdAt" >= $1 AND o."createdAt" < $2
        GROUP BY 1`,
      start,
      end,
    ),
  ]);

  const costByDay = new Map(costRows.map((r) => [r.day, Number(r.cost)]));
  return revenueRows
    .map((r) => {
      const merchandise = Number(r.net);
      const cost = costByDay.get(r.day) ?? 0;
      return {
        day: r.day,
        orders: Number(r.orders),
        revenue: Number(r.revenue),
        merchandise,
        cost,
        profit: merchandise - cost,
      };
    })
    .sort((a, b) => a.day.localeCompare(b.day));
}

async function topProducts(start: Date, end: Date) {
  const rows = await db.$queryRawUnsafe<
    { name: string; units: bigint; revenue: bigint; cost: bigint; has_cost: boolean }[]
  >(
    `SELECT oi."productName" AS name,
            SUM(oi.quantity)::bigint AS units,
            SUM(oi."totalCents")::bigint AS revenue,
            SUM(oi.quantity * COALESCE(p."costCents", 0))::bigint AS cost,
            bool_and(p."costCents" IS NOT NULL) AS has_cost
       FROM "OrderItem" oi
       JOIN "Order" o ON o.id = oi."orderId"
       LEFT JOIN "Product" p ON p.id = oi."productId"
      WHERE o.status IN (${REVENUE_SQL}) AND o."createdAt" >= $1 AND o."createdAt" < $2
      GROUP BY 1
      ORDER BY SUM(oi."totalCents") - SUM(oi.quantity * COALESCE(p."costCents", 0)) DESC
      LIMIT 8`,
    start,
    end,
  );

  return rows.map((r) => {
    const revenue = Number(r.revenue);
    const cost = Number(r.cost);
    return {
      name: r.name,
      units: Number(r.units),
      revenue,
      cost,
      profit: revenue - cost,
      hasCost: r.has_cost,
    };
  });
}

export type FinanceReport = Awaited<ReturnType<typeof getFinanceReport>>;

export async function getFinanceReport(period: Period) {
  const previous = previousPeriod(period);

  const [orders, items, daily, top, byPayment, pending, canceled, prevOrders, prevItems] =
    await Promise.all([
      ordersTotals(period.start, period.end),
      itemsTotals(period.start, period.end),
      dailySeries(period.start, period.end),
      topProducts(period.start, period.end),
      db.order.groupBy({
        by: ["paymentMethod"],
        where: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: period.start, lt: period.end },
        },
        _sum: { totalCents: true },
        _count: true,
      }),
      db.order.aggregate({
        where: { status: "PENDING", createdAt: { gte: period.start, lt: period.end } },
        _sum: { totalCents: true },
        _count: true,
      }),
      db.order.count({
        where: { status: "CANCELED", createdAt: { gte: period.start, lt: period.end } },
      }),
      ordersTotals(previous.start, previous.end),
      itemsTotals(previous.start, previous.end),
    ]);

  return {
    totals: buildTotals(orders, items),
    previous: { ...buildTotals(prevOrders, prevItems), from: previous.from, to: previous.to },
    daily,
    topProducts: top,
    byPayment: byPayment
      .map((p) => ({
        method: p.paymentMethod as PaymentMethod,
        orders: p._count,
        revenue: p._sum.totalCents ?? 0,
      }))
      .sort((a, b) => b.revenue - a.revenue),
    pending: { orders: pending._count, revenue: pending._sum.totalCents ?? 0 },
    canceledOrders: canceled,
  };
}
