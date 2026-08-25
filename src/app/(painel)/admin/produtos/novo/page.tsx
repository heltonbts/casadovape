import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { EMPTY_PRODUCT, ProductForm } from "@/components/admin/product-form";
import { db } from "@/lib/db";

export const metadata = { title: "Novo produto" };

export default async function NovoProdutoPage() {
  const [categories, brands] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <Link
        href="/admin/produtos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={15} /> Voltar aos produtos
      </Link>
      <PageHeader title="Novo produto" description="Cadastre um item do catálogo." />
      <ProductForm initial={EMPTY_PRODUCT} categories={categories} brands={brands} />
    </>
  );
}
