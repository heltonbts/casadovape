import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm, type ProductFormData } from "@/components/admin/product-form";
import { db } from "@/lib/db";
import { fromCents } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/admin/produtos/[id]">) {
  const { id } = await props.params;
  const product = await db.product.findUnique({ where: { id }, select: { name: true } });
  return { title: product?.name ?? "Produto" };
}

export default async function EditarProdutoPage(props: PageProps<"/admin/produtos/[id]">) {
  const { id } = await props.params;

  const [product, categories, brands] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: { orderBy: { position: "asc" } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  const initial: ProductFormData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    summary: product.summary ?? "",
    description: product.description ?? "",
    price: fromCents(product.priceCents),
    compareAt: fromCents(product.compareAtCents),
    cost: fromCents(product.costCents),
    categoryId: product.categoryId ?? "",
    brandId: product.brandId ?? "",
    featured: product.featured,
    active: product.active,
    puffs: product.puffs?.toString() ?? "",
    nicotineMg: product.nicotineMg ?? "",
    liquidMl: product.liquidMl ?? "",
    batteryMah: product.batteryMah?.toString() ?? "",
    rechargeable: product.rechargeable === null ? "" : product.rechargeable ? "sim" : "nao",
    images: product.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku ?? "",
      price: fromCents(v.priceCents),
      stock: String(v.stock),
      lowStockAlert: String(v.lowStockAlert),
      active: v.active,
    })),
  };

  return (
    <>
      <Link
        href="/admin/produtos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={15} /> Voltar aos produtos
      </Link>
      <PageHeader title={product.name} description="Editar produto do catálogo." />
      <ProductForm initial={initial} categories={categories} brands={brands} />
    </>
  );
}
