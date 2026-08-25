import { PageHeader } from "@/components/admin/ui";
import { BrandManager, CategoryManager } from "@/components/admin/catalog-managers";
import { db } from "@/lib/db";

export const metadata = { title: "Categorias e marcas" };

export default async function CategoriasPage() {
  const [categories, brands] = await Promise.all([
    db.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    }),
    db.brand.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Categorias e marcas"
        description="Organizam o menu da loja e os filtros da listagem."
      />

      <h2 className="mb-3 font-bold text-white">Categorias</h2>
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          position: c.position,
          active: c.active,
          productCount: c._count.products,
        }))}
      />

      <h2 className="mb-3 mt-10 font-bold text-white">Marcas</h2>
      <BrandManager
        brands={brands.map((b) => ({
          id: b.id,
          name: b.name,
          active: b.active,
          productCount: b._count.products,
        }))}
      />
    </>
  );
}
