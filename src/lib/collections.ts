import { cache } from "react";
import { db } from "@/lib/db";
import { PRODUCT_CARD_SELECT } from "@/lib/catalog";

/** Quantos produtos de cada lista cabem na prateleira da home. */
export const HOME_LIST_LIMIT = 10;

/**
 * Uma lista só existe para o cliente se tiver produto ativo dentro. Isso vale
 * para a home e para o menu: lista vazia (ou só com produto oculto) não vira
 * uma página em branco.
 */
const withActiveProducts = {
  active: true,
  items: { some: { product: { active: true } } },
};

const itemsSelect = (take?: number) => ({
  where: { product: { active: true } },
  orderBy: { position: "asc" as const },
  ...(take ? { take } : {}),
  select: { productId: true, product: { select: PRODUCT_CARD_SELECT } },
});

/** As prateleiras da home, na ordem definida no painel. */
export const getHomeCollections = cache(async () => {
  const collections = await db.collection.findMany({
    where: { ...withActiveProducts, showOnHome: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      subtitle: true,
      items: itemsSelect(HOME_LIST_LIMIT),
      _count: { select: { items: { where: { product: { active: true } } } } },
    },
  });

  return collections.map((c) => ({
    ...c,
    products: c.items.map((i) => i.product),
    total: c._count.items,
  }));
});

/** Só o necessário para o menu da loja. */
export const getNavCollections = cache(() =>
  db.collection.findMany({
    where: withActiveProducts,
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { name: true, slug: true },
  }),
);

export async function getCollectionBySlug(slug: string) {
  const collection = await db.collection.findFirst({
    where: { slug, active: true },
    select: {
      id: true,
      name: true,
      slug: true,
      subtitle: true,
      items: itemsSelect(),
    },
  });
  if (!collection) return null;
  return { ...collection, products: collection.items.map((i) => i.product) };
}
