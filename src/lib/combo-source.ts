import "server-only";
import { db } from "@/lib/db";
import type { ComboSourceVariant } from "@/components/admin/product-form";

/**
 * As variantes que podem entrar num combo: tudo que é vendável e não é combo
 * (combo dentro de combo faria a baixa descer em cascata). `excludeProductId`
 * tira o próprio produto da lista quando se está editando.
 */
export async function getComboSourceVariants(
  excludeProductId?: string,
): Promise<ComboSourceVariant[]> {
  const variants = await db.productVariant.findMany({
    where: {
      active: true,
      product: { isCombo: false, ...(excludeProductId ? { id: { not: excludeProductId } } : {}) },
    },
    orderBy: [{ product: { name: "asc" } }, { position: "asc" }],
    select: {
      id: true,
      name: true,
      stock: true,
      priceCents: true,
      product: { select: { name: true, priceCents: true } },
    },
  });

  return variants.map((v) => ({
    id: v.id,
    label: `${v.product.name} — ${v.name}`,
    stock: v.stock,
    priceCents: v.priceCents ?? v.product.priceCents,
  }));
}
