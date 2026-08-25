import Link from "next/link";
import { Suspense } from "react";
import { PackageSearch } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { ProductFilters } from "@/components/store/product-filters";
import { getBrands, getCategories, listProducts, type ProductFilters as Filters } from "@/lib/catalog";

export const metadata = { title: "Produtos" };

export default async function ProdutosPage(props: PageProps<"/produtos">) {
  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const filters: Filters = {
    q: one(sp.q),
    categoria: one(sp.categoria),
    marca: one(sp.marca),
    ordem: one(sp.ordem) as Filters["ordem"],
    disponivel: one(sp.disponivel) === "1",
    page: Number(one(sp.page) ?? 1) || 1,
  };

  const [{ items, total, page, pages }, categories, brands] = await Promise.all([
    listProducts(filters),
    getCategories(),
    getBrands(),
  ]);

  const activeCategory = categories.find((c) => c.slug === filters.categoria);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-white">
          {filters.q
            ? `Resultados para "${filters.q}"`
            : (activeCategory?.name ?? "Todos os produtos")}
        </h1>
        {activeCategory?.description && (
          <p className="mt-1 text-sm text-white/50">{activeCategory.description}</p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="lg:block">
          <Suspense fallback={<div className="surface h-96" />}>
            <ProductFilters
              categories={categories.map((c) => ({
                name: c.name,
                slug: c.slug,
                count: c._count.products,
              }))}
              brands={brands.map((b) => ({ name: b.name, slug: b.slug }))}
              total={total}
            />
          </Suspense>
        </aside>

        <div>
          {items.length === 0 ? (
            <div className="surface grid place-items-center gap-3 p-16 text-center">
              <PackageSearch className="text-white/25" size={40} />
              <p className="font-semibold text-white">Nenhum produto encontrado</p>
              <p className="max-w-sm text-sm text-white/45">
                Tente remover algum filtro ou buscar por outro termo.
              </p>
              <Link href="/produtos" className="text-sm font-medium text-brand-200 hover:text-white">
                Ver todos os produtos →
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 3} />
                ))}
              </div>

              {pages > 1 && (
                <nav className="mt-8 flex justify-center gap-1.5" aria-label="Paginação">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => {
                    const params = new URLSearchParams(
                      Object.entries(sp).flatMap(([k, v]) =>
                        v === undefined || k === "page" ? [] : [[k, Array.isArray(v) ? v[0] : v] as [string, string]],
                      ),
                    );
                    params.set("page", String(n));
                    return (
                      <Link
                        key={n}
                        href={`/produtos?${params.toString()}`}
                        className={`grid size-10 place-items-center rounded-xl text-sm font-medium transition ${
                          n === page
                            ? "bg-brand-500 text-white"
                            : "border border-white/10 text-white/60 hover:border-brand-400"
                        }`}
                      >
                        {n}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
