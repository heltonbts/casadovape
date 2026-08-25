import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ProductThumb } from "@/components/store/product-thumb";
import { brl } from "@/lib/utils";
import { totalStock, type ProductCardData } from "@/lib/catalog";

export function ProductCard({ product, priority }: { product: ProductCardData; priority?: boolean }) {
  const stock = totalStock(product);
  const soldOut = stock === 0;
  const discount =
    product.compareAtCents && product.compareAtCents > product.priceCents
      ? Math.round((1 - product.priceCents / product.compareAtCents) * 100)
      : null;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group surface flex flex-col overflow-hidden p-3 transition hover:border-brand-400/50 hover:shadow-xl hover:shadow-brand-600/10"
    >
      <div className="relative">
        <ProductThumb
          src={product.images[0]?.url}
          alt={product.images[0]?.alt}
          name={product.name}
          priority={priority}
          className="aspect-square w-full transition duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {discount && <Badge tone="accent">-{discount}%</Badge>}
          {product.featured && !discount && <Badge tone="brand">Destaque</Badge>}
        </div>
        {soldOut && (
          <div className="absolute inset-0 grid place-items-center rounded-xl bg-ink-950/70">
            <Badge tone="danger">Esgotado</Badge>
          </div>
        )}
        {!soldOut && stock <= 5 && (
          <div className="absolute bottom-2 left-2">
            {/* Sem número: o saldo é informação do painel, não da vitrine. */}
            <Badge tone="warning">Últimas unidades</Badge>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        {product.brand && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-200/70">
            {product.brand.name}
          </span>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-white">
          {product.name}
        </h3>

        {(product.puffs || product.nicotineMg) && (
          <p className="mt-1 text-xs text-white/45">
            {[product.puffs ? `${product.puffs.toLocaleString("pt-BR")} puffs` : null, product.nicotineMg]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}

        <div className="mt-auto pt-3">
          {product.compareAtCents && product.compareAtCents > product.priceCents && (
            <span className="mr-2 text-xs text-white/35 line-through">{brl(product.compareAtCents)}</span>
          )}
          <span className="text-lg font-bold text-white">{brl(product.priceCents)}</span>
          {product.variants.length > 1 && (
            <p className="mt-0.5 text-[11px] text-white/40">{product.variants.length} sabores</p>
          )}
        </div>
      </div>
    </Link>
  );
}
