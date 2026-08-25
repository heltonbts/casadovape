"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { setOrderStatus } from "@/lib/stock";
import type { OrderStatus } from "@/generated/prisma/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    await setOrderStatus(orderId, status, admin.id);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro ao atualizar pedido" };
  }
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/estoque");
  return { ok: true };
}

/**
 * Ajusta o valor final do pedido na hora de confirmar — desconto combinado no
 * WhatsApp, troco, taxa extra. Mexe só no `totalCents`: o `subtotalCents`
 * continua sendo a soma dos itens, e é a diferença entre os dois que o painel
 * mostra como ajuste. O faturamento lê `totalCents`, então o número novo é o
 * que conta no dashboard.
 */
export async function updateOrderTotalAction(
  orderId: string,
  totalCents: number,
): Promise<ActionResult> {
  await requireAdmin();
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    return { ok: false, error: "Valor inválido" };
  }

  await db.order.update({ where: { id: orderId }, data: { totalCents } });

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateOrderNotesAction(orderId: string, notes: string): Promise<ActionResult> {
  await requireAdmin();
  await db.order.update({ where: { id: orderId }, data: { notes: notes.trim() || null } });
  revalidatePath(`/admin/pedidos/${orderId}`);
  return { ok: true };
}

export async function deleteOrderAction(orderId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") {
    return { ok: false, error: "Apenas o dono da loja pode excluir pedidos" };
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: "Pedido não encontrado" };

  // Devolve o estoque antes de apagar, senão o saldo fica errado para sempre.
  if (order.stockApplied) {
    try {
      await setOrderStatus(orderId, "CANCELED", admin.id);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Erro ao estornar estoque" };
    }
  }

  await db.order.delete({ where: { id: orderId } });
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin");
  return { ok: true };
}
