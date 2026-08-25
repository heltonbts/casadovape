"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export type CrudResult = { ok: true } | { ok: false; error: string };

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Informe o nome da categoria"),
  description: z.string().trim().optional(),
  position: z.number().int().nonnegative(),
  active: z.boolean(),
});

const brandSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Informe o nome da marca"),
  active: z.boolean(),
});

function revalidateCatalog() {
  revalidatePath("/admin/categorias");
  revalidatePath("/produtos");
  revalidatePath("/");
}

export async function saveCategoryAction(input: z.input<typeof categorySchema>): Promise<CrudResult> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, name, description, position, active } = parsed.data;

  const data = { name, slug: slugify(name), description: description || null, position, active };
  try {
    if (id) await db.category.update({ where: { id }, data });
    else await db.category.create({ data });
  } catch {
    return { ok: false, error: "Já existe uma categoria com esse nome" };
  }
  revalidateCatalog();
  return { ok: true };
}

export async function deleteCategoryAction(id: string): Promise<CrudResult> {
  await requireAdmin();
  // Produtos ficam sem categoria (onDelete: SetNull), não são apagados.
  await db.category.delete({ where: { id } });
  revalidateCatalog();
  return { ok: true };
}

export async function saveBrandAction(input: z.input<typeof brandSchema>): Promise<CrudResult> {
  await requireAdmin();
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, name, active } = parsed.data;

  const data = { name, slug: slugify(name), active };
  try {
    if (id) await db.brand.update({ where: { id }, data });
    else await db.brand.create({ data });
  } catch {
    return { ok: false, error: "Já existe uma marca com esse nome" };
  }
  revalidateCatalog();
  return { ok: true };
}

export async function deleteBrandAction(id: string): Promise<CrudResult> {
  await requireAdmin();
  await db.brand.delete({ where: { id } });
  revalidateCatalog();
  return { ok: true };
}
