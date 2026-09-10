import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, MessageCircle, Package, ShieldCheck, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddToCart } from "@/components/store/add-to-cart";
import { ProductCard } from "@/components/store/product-card";
import { ProductThumb } from "@/components/store/product-thumb";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { comboLooseTotal, comboStock } from "@/lib/combo";
import { getSettings } from "@/lib/settings";
import { brl, whatsappLink } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/produto/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.summary ?? product.description?.slice(0, 150),
  };
}

export default async function ProdutoPage(props: PageProps<"/produto/[slug]">) {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [settings, related] = await Promise.all([
    getSettings(),
    getRelatedProducts(product.id, product.categoryId, 4),
  ]);

  // Combo não soma o próprio estoque: ele vale o que dá para montar com os
  // itens de dentro.
  const stock = product.isCombo
    ? comboStock(product.comboItems)
    : product.variants.reduce((sum, v) => sum + v.stock, 0);
  const looseTotal = product.isCombo ? comboLooseTotal(product.comboItems) : 0;
  const savings = looseTotal - product.priceCents;
  const discount =
    product.compareAtCents && product.compareAtCents > product.priceCents
      ? Math.round((1 - product.priceCents / product.compareAtCents) * 100)
      : null;

  const specs = [
    product.puffs && { label: "Puffs", value: product.puffs.toLocaleString("pt-BR") },
    product.nicotineMg && { label: "Nicotina", value: product.nicotineMg },
    product.liquidMl && { label: "Líquido", value: product.liquidMl },
    product.batteryMah && { label: "Bateria", value: `${product.batteryMah} mAh` },
    product.rechargeable !== null && {
      label: "Recarregável",
      value: product.rechargeable ? "Sim" : "Não",
    },
    product.brand && { label: "Marca", value: product.brand.name },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-white/40">
        <Link href="/" className="hover:text-white">
          Início
        </Link>
        <ChevronRight size={13} />
        <Link href="/produtos" className="hover:text-white">
          Produtos
        </Link>
        {product.category && (
          <>
            <ChevronRight size={13} />
            <Link href={`/produtos?categoria=${product.category.slug}`} className="hover:text-white">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ------------------------------------------------------- imagens */}
        <div className="space-y-3">
          <ProductThumb
            src={product.images[0]?.url}
            alt={product.images[0]?.alt}
            name={product.name}
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="aspect-square w-full"
          />
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.slice(1, 5).map((img) => (
                <ProductThumb
                  key={img.id}
                  src={img.url}
                  alt={img.alt}
                  name={product.name}
                  sizes="20vw"
                  className="aspect-square w-full"
                />
              ))}
            </div>
          )}
        </div>

        {/* --------------------------------------------------------- compra */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.isCombo && (
              <Badge tone="brand">
                <Package size={12} /> Combo
              </Badge>
            )}
            {product.brand && <Badge tone="brand">{product.brand.name}</Badge>}
            {discount && <Badge tone="accent">-{discount}% OFF</Badge>}
            {stock > 0 ? (
              <Badge tone="success">Em estoque</Badge>
            ) : (
              <Badge tone="danger">Esgotado</Badge>
            )}
          </div>

          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-white">
            {product.name}
          </h1>
          {product.summary && <p className="mt-2 text-white/55">{product.summary}</p>}

          <div className="mt-5 flex items-end gap-3">
            <span className="text-4xl font-black text-white">{brl(product.priceCents)}</span>
            {product.compareAtCents && product.compareAtCents > product.priceCents && (
              <span className="pb-1 text-lg text-white/35 line-through">
                {brl(product.compareAtCents)}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-accent-300">
            À vista no Pix{settings.pixKey ? " · aprovação imediata" : ""}
          </p>

          {product.isCombo && product.comboItems.length > 0 && (
            <div className="surface mt-5 p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <Package size={15} className="text-brand-200" /> O que vem no combo
              </h2>
              <ul className="mt-3 space-y-2.5">
                {product.comboItems.map((item) => (
                  <li key={item.variant.id} className="flex items-center gap-3">
                    <ProductThumb
                      src={item.variant.product.images[0]?.url}
                      alt={item.variant.product.images[0]?.alt}
                      name={item.variant.product.name}
                      sizes="48px"
                      className="size-12 shrink-0 rounded-lg"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">
                        {item.quantity > 1 && `${item.quantity}× `}
                        {item.variant.product.name}
                      </span>
                      <span className="text-xs text-white/45">{item.variant.name}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {savings > 0 && (
                <p className="mt-3 border-t border-white/8 pt-3 text-sm text-emerald-300">
                  Separado sairia {brl(looseTotal)} — você economiza{" "}
                  <strong className="font-semibold">{brl(savings)}</strong>.
                </p>
              )}
            </div>
          )}

          <div className="my-6 h-px bg-white/8" />

          <AddToCart
            productId={product.id}
            slug={product.slug}
            productName={product.name}
            basePriceCents={product.priceCents}
            variants={product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              // O combo tem uma variante só, e o saldo dela é o do conjunto.
              stock: product.isCombo ? stock : v.stock,
              priceCents: v.priceCents,
            }))}
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Truck, text: "Entrega rápida" },
              { icon: ShieldCheck, text: "Produto original" },
              { icon: MessageCircle, text: "Suporte no zap" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-xs text-white/60"
              >
                <Icon size={15} className="shrink-0 text-accent-400" />
                {text}
              </div>
            ))}
          </div>

          <a
            href={whatsappLink(
              settings.whatsapp,
              `Olá! Tenho uma dúvida sobre o produto *${product.name}*.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block text-center text-sm text-white/45 hover:text-white"
          >
            Ficou com dúvida? Chama no WhatsApp →
          </a>
        </div>
      </div>

      {/* ------------------------------------------------------- descrição */}
      <div className="mt-12 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {product.description && (
          <section className="surface p-6">
            <h2 className="text-lg font-bold text-white">Sobre o produto</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-white/60">
              {product.description}
            </p>
          </section>
        )}

        {specs.length > 0 && (
          <section className="surface p-6">
            <h2 className="text-lg font-bold text-white">Especificações</h2>
            <dl className="mt-3 divide-y divide-white/8">
              {specs.map((s) => (
                <div key={s.label} className="flex justify-between gap-4 py-2.5 text-sm">
                  <dt className="text-white/45">{s.label}</dt>
                  <dd className="text-right font-medium text-white">{s.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-black tracking-tight text-white">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
