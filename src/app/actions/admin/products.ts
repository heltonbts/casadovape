"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

const variantSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "A variante precisa de um nome"),
  sku: z.string().trim().optional(),
  priceCents: z.number().int().nonnegative().nullable(),
  stock: z.number().int(),
  lowStockAlert: z.number().int().nonnegative(),
  active: z.boolean(),
});

const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome do produto"),
  slug: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  description: z.string().trim().optional(),
  priceCents: z.number().int().positive("O preço precisa ser maior que zero"),
  compareAtCents: z.number().int().nonnegative().nullable(),
  costCents: z.number().int().nonnegative().nullable(),
  categoryId: z.string().nullable(),
  brandId: z.string().nullable(),
  featured: z.boolean(),
  active: z.boolean(),
  puffs: z.number().int().nonnegative().nullable(),
  nicotineMg: z.string().trim().optional(),
  liquidMl: z.string().trim().optional(),
  batteryMah: z.number().int().nonnegative().nullable(),
  rechargeable: z.boolean().nullable(),
  images: z.array(z.object({ url: z.url("URL de imagem inválida"), alt: z.string().optional() })),
  variants: z.array(variantSchema).min(1, "Cadastre ao menos uma variante"),
});

export type ProductInput = z.infer<typeof productSchema>;
export type SaveResult = { ok: true; id: string; slug: string } | { ok: false; error: string };

/** Gera um slug único, acrescentando sufixo numérico em caso de colisão. */
async function uniqueSlug(base: string, ignoreId?: string) {
  const root = slugify(base) || "produto";
  let candidate = root;
  let n = 1;
  while (true) {
    const existing = await db.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${root}-${++n}`;
  }
}

export async function saveProductAction(input: ProductInput): Promise<SaveResult> {
  await requireAdmin();

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  const names = data.variants.map((v) => v.name.trim().toLowerCase());
  if (new Set(names).size !== names.length) {
    return { ok: false, error: "Há variantes com o mesmo nome" };
  }

  const slug = await uniqueSlug(data.slug?.trim() || data.name, data.id);

  const base = {
    name: data.name,
    slug,
    summary: data.summary || null,
    description: data.description || null,
    priceCents: data.priceCents,
    compareAtCents: data.compareAtCents,
    costCents: data.costCents,
    categoryId: data.categoryId,
    brandId: data.brandId,
    featured: data.featured,
    active: data.active,
    puffs: data.puffs,
    nicotineMg: data.nicotineMg || null,
    liquidMl: data.liquidMl || null,
    batteryMah: data.batteryMah,
    rechargeable: data.rechargeable,
  };

  try {
    const product = await db.$transaction(async (tx) => {
      const saved = data.id
        ? await tx.product.update({ where: { id: data.id }, data: base })
        : await tx.product.create({ data: base });

      // Imagens são recriadas a cada salvamento: a lista do formulário é a
      // verdade, e são poucos registros.
      await tx.productImage.deleteMany({ where: { productId: saved.id } });
      if (data.images.length > 0) {
        await tx.productImage.createMany({
          data: data.images.map((img, i) => ({
            productId: saved.id,
            url: img.url,
            alt: img.alt || null,
            position: i,
          })),
        });
      }

      // Variantes que sumiram do formulário são removidas; o histórico de
      // pedidos sobrevive porque OrderItem guarda o nome em snapshot.
      const keepIds = data.variants.map((v) => v.id).filter(Boolean) as string[];
      await tx.productVariant.deleteMany({
        where: { productId: saved.id, id: { notIn: keepIds.length ? keepIds : ["-"] } },
      });

      for (const [i, variant] of data.variants.entries()) {
        if (variant.id) {
          // O estoque não é editado aqui — ele só muda por movimentação,
          // para que saldo e histórico continuem batendo.
          await tx.productVariant.update({
            where: { id: variant.id },
            data: {
              name: variant.name,
              sku: variant.sku || null,
              priceCents: variant.priceCents,
              lowStockAlert: variant.lowStockAlert,
              active: variant.active,
              position: i,
            },
          });
        } else {
          const created = await tx.productVariant.create({
            data: {
              productId: saved.id,
              name: variant.name,
              sku: variant.sku || null,
              priceCents: variant.priceCents,
              stock: Math.max(0, variant.stock),
              lowStockAlert: variant.lowStockAlert,
              active: variant.active,
              position: i,
            },
          });
          if (created.stock > 0) {
            await tx.stockMovement.create({
              data: {
                variantId: created.id,
                type: "IN",
                quantity: created.stock,
                balance: created.stock,
                reason: "Estoque inicial",
              },
            });
          }
        }
      }

      return saved;
    });

    revalidatePath("/admin/produtos");
    revalidatePath("/admin/estoque");
    revalidatePath("/produtos");
    revalidatePath(`/produto/${product.slug}`);
    revalidatePath("/");
    return { ok: true, id: product.id, slug: product.slug };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao salvar o produto";
    if (message.includes("Unique constraint") && message.includes("sku")) {
      return { ok: false, error: "Já existe uma variante com esse SKU" };
    }
    return { ok: false, error: message };
  }
}

export async function toggleProductActiveAction(id: string, active: boolean) {
  await requireAdmin();
  await db.product.update({ where: { id }, data: { active } });
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteProductAction(id: string) {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") {
    return { ok: false as const, error: "Apenas o dono da loja pode excluir produtos" };
  }
  await db.product.delete({ where: { id } });
  revalidatePath("/admin/produtos");
  revalidatePath("/produtos");
  revalidatePath("/");
  return { ok: true as const };
}
