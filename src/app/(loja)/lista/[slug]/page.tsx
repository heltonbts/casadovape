import Link from "next/link";
import { notFound } from "next/navigation";
import { LayoutList } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { getCollectionBySlug } from "@/lib/collections";
import { db } from "@/lib/db";

export async function generateMetadata(props: PageProps<"/lista/[slug]">) {
  const { slug } = await props.params;
  const collection = await db.collection.findFirst({
    where: { slug, active: true },
    select: { name: true, subtitle: true },
  });
  if (!collection) return { title: "Lista não encontrada" };
  return {
    title: collection.name,
    description: collection.subtitle ?? `${collection.name} — a seleção da Casa do Vape.`,
  };
}

export default async function ListaPage(props: PageProps<"/lista/[slug]">) {
  const { slug } = await props.params;
  const collection = await getCollectionBySlug(slug);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-200">
          <LayoutList size={13} /> Seleção da loja
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-white">{collection.name}</h1>
        {collection.subtitle && (
          <p className="mt-1 max-w-xl text-sm text-white/50">{collection.subtitle}</p>
        )}
      </header>

      {collection.products.length === 0 ? (
        <div className="surface grid place-items-center gap-3 p-16 text-center">
          <LayoutList className="text-white/25" size={40} />
          <p className="font-semibold text-white">Essa lista está vazia no momento</p>
          <Link href="/produtos" className="text-sm font-medium text-brand-200 hover:text-white">
            Ver todos os produtos →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {collection.products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 5} />
          ))}
        </div>
      )}
    </div>
  );
}
