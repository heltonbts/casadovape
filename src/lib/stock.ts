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
      for (const line of await explodeItems(tx, order.items)) {
        await applyMovement(tx, {
          variantId: line.variantId,
          type: "SALE",
          quantity: -line.quantity,
          reason: line.reason(`Pedido #${order.number}`),
          orderId: order.id,
          adminId,
        });
      }
    }

    if (!shouldConsume && order.stockApplied) {
      for (const line of await explodeItems(tx, order.items)) {
        await applyMovement(tx, {
          variantId: line.variantId,
          type: "RETURN",
          quantity: line.quantity,
          reason: line.reason(`Estorno do pedido #${order.number}`),
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

/**
 * Traduz os itens do pedido no que sai de fato da prateleira. Item comum é ele
 * mesmo; combo vira as variantes de dentro, multiplicadas pela quantidade
 * vendida. O combo não tem estoque próprio, então movimentar a variante dele
 * seria mexer num saldo que ninguém repõe.
 *
 * A composição é lida no momento da baixa, e não no do pedido: se o combo for
 * remontado entre a venda e a confirmação, vale o que ele é agora — que é o
 * que a loja vai separar para entregar.
 */
async function explodeItems(tx: Tx, items: { variantId: string | null; quantity: number }[]) {
  const lines: { variantId: string; quantity: number; reason: (base: string) => string }[] = [];

  for (const item of items) {
    if (!item.variantId) continue;

    const variant = await tx.productVariant.findUnique({
      where: { id: item.variantId },
      select: {
        product: {
          select: {
            name: true,
            isCombo: true,
            comboItems: { select: { variantId: true, quantity: true } },
          },
        },
      },
    });

    if (!variant?.product.isCombo) {
      lines.push({ variantId: item.variantId, quantity: item.quantity, reason: (base) => base });
      continue;
    }

    for (const part of variant.product.comboItems) {
      lines.push({
        variantId: part.variantId,
        quantity: item.quantity * Math.max(1, part.quantity),
        reason: (base) => `${base} · combo ${variant.product.name}`,
      });
    }
  }

  return lines;
}
