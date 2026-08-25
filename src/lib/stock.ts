import "server-only";
import { db } from "@/lib/db";
import type { OrderStatus, StockMovementType } from "@/generated/prisma/enums";

/** Status em que o pedido já consumiu o estoque. */
const CONSUMES_STOCK: OrderStatus[] = ["PAID", "SHIPPED", "DELIVERED"];

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Aplica um delta de estoque numa variante e registra o movimento.
 * `quantity` é o delta com sinal: +10 entrada, -3 saída.
 * Roda dentro de uma transação para que saldo e histórico nunca divirjam.
 */
export async function applyMovement(
  tx: Tx,
  input: {
    variantId: string;
    type: StockMovementType;
    quantity: number;
    reason?: string | null;
    orderId?: string | null;
    adminId?: string | null;
    /** Permite saldo negativo (ex.: ajuste manual de inventário). */
    allowNegative?: boolean;
  },
) {
  const variant = await tx.productVariant.findUnique({
    where: { id: input.variantId },
    select: { id: true, stock: true, name: true, product: { select: { name: true } } },
  });
  if (!variant) throw new Error("Variante não encontrada");

  const balance = variant.stock + input.quantity;
  if (balance < 0 && !input.allowNegative) {
    throw new Error(
      `Estoque insuficiente de ${variant.product.name} (${variant.name}): ${variant.stock} disponível`,
    );
  }

  await tx.productVariant.update({ where: { id: variant.id }, data: { stock: balance } });
  await tx.stockMovement.create({
    data: {
      variantId: variant.id,
      type: input.type,
      quantity: input.quantity,
      balance,
      reason: input.reason ?? null,
      orderId: input.orderId ?? null,
      adminId: input.adminId ?? null,
    },
  });

  return balance;
}

/** Entrada/saída/ajuste manual disparado pelo admin. */
export async function registerManualMovement(input: {
  variantId: string;
  type: Extract<StockMovementType, "IN" | "OUT" | "ADJUST" | "LOSS">;
  quantity: number;
  reason?: string;
  adminId: string;
}) {
  const signed =
    input.type === "IN"
      ? Math.abs(input.quantity)
      : input.type === "ADJUST"
        ? input.quantity
        : -Math.abs(input.quantity);

  return db.$transaction((tx) =>
    applyMovement(tx, {
      variantId: input.variantId,
      type: input.type,
      quantity: signed,
      reason: input.reason,
      adminId: input.adminId,
      allowNegative: input.type === "ADJUST",
    }),
  );
}

/**
 * Muda o status do pedido e sincroniza o estoque.
 *
 * A trava `stockApplied` deixa a operação idempotente: marcar "pago" duas
 * vezes debita uma vez só, e cancelar um pedido pago devolve as unidades
 * exatamente uma vez.
 */
export async function setOrderStatus(orderId: string, status: OrderStatus, adminId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error("Pedido não encontrado");

    const shouldConsume = CONSUMES_STOCK.includes(status);

    if (shouldConsume && !order.stockApplied) {
      for (const item of order.items) {
        if (!item.variantId) continue;
        await applyMovement(tx, {
          variantId: item.variantId,
          type: "SALE",
          quantity: -item.quantity,
          reason: `Pedido #${order.number}`,
          orderId: order.id,
          adminId,
        });
      }
    }

    if (!shouldConsume && order.stockApplied) {
      for (const item of order.items) {
        if (!item.variantId) continue;
        await applyMovement(tx, {
          variantId: item.variantId,
          type: "RETURN",
          quantity: item.quantity,
          reason: `Estorno do pedido #${order.number}`,
          orderId: order.id,
          adminId,
        });
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status, stockApplied: shouldConsume },
    });
  });
}
