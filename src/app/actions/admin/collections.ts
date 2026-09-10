"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export type ActionResult = { ok: true } | { ok: false; error: string };

const collectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Dê um nome à lista"),
  slug: z.string().trim().optional(),
  subtitle: z.string().trim().optional(),
  active: z.boolean(),
  showOnHome: z.boolean(),
});

export type CollectionInput = z.infer<typeof collectionSchema>;

/** Revalida tudo que enxerga uma lista: painel, home, menu e página da lista. */
function revalidateAll(slug?: string) {
  revalidatePath("/admin/listas", "layout");
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/lista/${slug}`);
}

async function uniqueSlug(base: string, ignoreId?: string) {
  const root = slugify(base) || "lista";
  let candidate = root;
  let n = 1;
  while (true) {
    const existing = await db.collection.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${root}-${++n}`;
  }
}

export async function saveCollectionAction(
  input: CollectionInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await requireAdmin();

  const parsed = collectionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;

  const slug = await uniqueSlug(data.slug?.trim() || data.name, data.id);
  const base = {
    name: data.name,
    slug,
    subtitle: data.subtitle || null,
    active: data.active,
    showOnHome: data.showOnHome,
  };

  const saved = data.id
    ? await db.collection.update({ where: { id: data.id }, data: base })
    : await db.collection.create({
        data: {
          ...base,
          // Lista nova entra no fim da fila da home.
          position: ((await db.collection.aggregate({ _max: { position: true } }))._max.position ?? -1) + 1,
        },
      });

  revalidateAll(saved.slug);
  return { ok: true, id: saved.id };
}

export async function deleteCollectionAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  // Só a lista morre: os produtos dentro dela seguem no catálogo.
  await db.collection.delete({ where: { id } });
  revalidateAll();
  return { ok: true };
}

/**
 * Sobe ou desce a lista trocando a posição com a vizinha. Renumera antes de
 * trocar porque as listas antigas podem ter empatado em position 0.
 */
export async function moveCollectionAction(id: string, direction: "up" | "down"): Promise<ActionResult> {
  await requireAdmin();

  const all = await db.collection.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const index = all.findIndex((c) => c.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= all.length) return { ok: true };

  const order = [...all];
  [order[index], order[target]] = [order[target], order[index]];

  await db.$transaction(
    order.map((c, i) => db.collection.update({ where: { id: c.id }, data: { position: i } })),
  );

  revalidateAll();
  return { ok: true };
}

export async function addProductToCollectionAction(
  collectionId: string,
  productId: string,
): Promise<ActionResult> {
  await requireAdmin();

  const last = await db.collectionItem.aggregate({
    where: { collectionId },
    _max: { position: true },
  });

  try {
    await db.collectionItem.create({
      data: { collectionId, productId, position: (last._max.position ?? -1) + 1 },
    });
  } catch {
    // O unique [collectionId, productId] já garante que não duplica; se o
    // produto entrou por outra aba aberta, não é erro para o usuário.
    return { ok: true };
  }

  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    select: { slug: true },
  });
  revalidateAll(collection?.slug);
  return { ok: true };
}

export async function removeProductFromCollectionAction(
  collectionId: string,
  productId: string,
): Promise<ActionResult> {
  await requireAdmin();

  await db.collectionItem.deleteMany({ where: { collectionId, productId } });
  await renumber(collectionId);

  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    select: { slug: true },
  });
  revalidateAll(collection?.slug);
  return { ok: true };
}

export async function moveCollectionItemAction(
  collectionId: string,
  productId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  await requireAdmin();

  const items = await db.collectionItem.findMany({
    where: { collectionId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, productId: true },
  });
  const index = items.findIndex((i) => i.productId === productId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= items.length) return { ok: true };

  const order = [...items];
  [order[index], order[target]] = [order[target], order[index]];

  await db.$transaction(
    order.map((item, i) => db.collectionItem.update({ where: { id: item.id }, data: { position: i } })),
  );

  const collection = await db.collection.findUnique({
    where: { id: collectionId },
    select: { slug: true },
  });
  revalidateAll(collection?.slug);
  return { ok: true };
}

/** Fecha os buracos de position depois de uma remoção. */
async function renumber(collectionId: string) {
  const items = await db.collectionItem.findMany({
    where: { collectionId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  await db.$transaction(
    items.map((item, i) => db.collectionItem.update({ where: { id: item.id }, data: { position: i } })),
  );
}
