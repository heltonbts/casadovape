"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { registerManualMovement } from "@/lib/stock";

export type StockResult = { ok: true; balance: number } | { ok: false; error: string };

export async function registerMovementAction(input: {
  variantId: string;
  type: "IN" | "OUT" | "ADJUST" | "LOSS";
  quantity: number;
  reason?: string;
}): Promise<StockResult> {
  const admin = await requireAdmin();

  if (!Number.isInteger(input.quantity) || input.quantity === 0) {
    return { ok: false, error: "Informe uma quantidade diferente de zero" };
  }

  try {
    const balance = await registerManualMovement({ ...input, adminId: admin.id });
    revalidatePath("/admin/estoque");
    revalidatePath("/admin/produtos");
    revalidatePath("/admin");
    revalidatePath("/produtos");
    return { ok: true, balance };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Erro ao registrar movimentação",
    };
  }
}
