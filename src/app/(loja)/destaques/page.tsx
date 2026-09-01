import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { getFeaturedProducts } from "@/lib/catalog";

export const metadata = {
  title: "Destaques",
  description: "A seleção da Casa do Vape — os pods e vapes que a loja recomenda.",
};

export default async function DestaquesPage() {
  const products = await getFeaturedProducts();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-200">
          <Sparkles size={13} /> Seleção da loja
        </span>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-white">Destaques</h1>
        <p className="mt-1 max-w-xl text-sm text-white/50">
          O que a gente recomenda de olhos fechados. Frete grátis em Aracati e pedido fechado
          no WhatsApp.
        </p>
      </header>

      {products.length === 0 ? (
        <div className="surface grid place-items-center gap-3 p-16 text-center">
          <Sparkles className="text-white/25" size={40} />
          <p className="font-semibold text-white">Nenhum destaque no momento</p>
          <p className="max-w-sm text-sm text-white/45">
            A seleção muda toda semana. Enquanto isso, dá uma olhada no catálogo inteiro.
          </p>
          <Link href="/produtos" className="text-sm font-medium text-brand-200 hover:text-white">
            Ver todos os produtos →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 5} />
          ))}
        </div>
      )}
    </div>
  );
}
