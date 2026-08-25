import { cache } from "react";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const PRODUCT_CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  summary: true,
  priceCents: true,
  compareAtCents: true,
  featured: true,
  puffs: true,
  nicotineMg: true,
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true, slug: true } },
  images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
  variants: {
    where: { active: true },
    select: { id: true, name: true, stock: true, priceCents: true },
    orderBy: { position: "asc" },
  },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof PRODUCT_CARD_SELECT }>;

export const totalStock = (p: { variants: { stock: number }[] }) =>
  p.variants.reduce((sum, v) => sum + v.stock, 0);

export const getCategories = cache(() =>
  db.category.findMany({
    where: { active: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { active: true } } } } },
  }),
);

export const getBrands = cache(() =>
  db.brand.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
);

export const getBanners = cache(() =>
  db.banner.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
);

/**
 * Catálogo inteiro, com os destaques na frente. A loja é pequena, então a home
 * mostra tudo de uma vez em vez de vitrines separadas — quem chega vê o que
 * existe sem precisar navegar.
 */
export function getAllProducts(take = 60) {
  return db.product.findMany({
    where: { active: true },
    select: PRODUCT_CARD_SELECT,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take,
  });
}

export type ProductFilters = {
  q?: string;
  categoria?: string;
  marca?: string;
  ordem?: "relevancia" | "menor-preco" | "maior-preco" | "novidades" | "nome";
  disponivel?: boolean;
  page?: number;
  perPage?: number;
};

const ORDER_BY: Record<string, Prisma.ProductOrderByWithRelationInput[]> = {
  relevancia: [{ featured: "desc" }, { createdAt: "desc" }],
  "menor-preco": [{ priceCents: "asc" }],
  "maior-preco": [{ priceCents: "desc" }],
  novidades: [{ createdAt: "desc" }],
  nome: [{ name: "asc" }],
};

export async function listProducts(filters: ProductFilters) {
  const perPage = filters.perPage ?? 12;
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.ProductWhereInput = { active: true };

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { brand: { name: { contains: q, mode: "insensitive" } } },
      { variants: { some: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (filters.categoria) where.category = { slug: filters.categoria };
  if (filters.marca) where.brand = { slug: filters.marca };
  if (filters.disponivel) where.variants = { some: { active: true, stock: { gt: 0 } } };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      select: PRODUCT_CARD_SELECT,
      orderBy: ORDER_BY[filters.ordem ?? "relevancia"] ?? ORDER_BY.relevancia,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.product.count({ where }),
  ]);

  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

export function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, active: true },
    include: {
      category: true,
      brand: true,
      images: { orderBy: { position: "asc" } },
      variants: { where: { active: true }, orderBy: { position: "asc" } },
    },
  });
}

export function getRelatedProducts(productId: string, categoryId: string | null, take = 4) {
  return db.product.findMany({
    where: { active: true, id: { not: productId }, ...(categoryId ? { categoryId } : {}) },
    select: PRODUCT_CARD_SELECT,
    take,
    orderBy: { featured: "desc" },
  });
}
