import Link from "next/link";
import { ArrowRight, BadgeCheck, Sparkles, Truck, Zap } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { getBanners, getCategories, getFeaturedProducts, getNewestProducts } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { brl } from "@/lib/utils";

export default async function HomePage() {
  const [settings, banners, categories, featured, newest] = await Promise.all([
    getSettings(),
    getBanners(),
    getCategories(),
    getFeaturedProducts(8),
    getNewestProducts(8),
  ]);

  const hero = banners[0];

  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* ------------------------------------------------------------- hero */}
      <section className="grid gap-8 py-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/25 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-200">
            <Sparkles size={13} /> Loja oficial · produtos originais
          </span>

          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            {hero?.title ?? "Os melhores pods, na sua porta"}
          </h1>

          <p className="mt-4 max-w-xl text-base text-white/55 sm:text-lg">
            {hero?.subtitle ??
              settings.tagline ??
              "Pods descartáveis, kits recarregáveis, juices e acessórios com pagamento no Pix e entrega rápida."}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={hero?.linkUrl ?? "/produtos"} size="lg">
              {hero?.ctaLabel ?? "Ver produtos"} <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/produtos?ordem=novidades" variant="outline" size="lg">
              Novidades
            </ButtonLink>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/8 pt-6">
            {[
              { icon: Truck, label: "Entrega", value: "Grátis na cidade" },
              { icon: BadgeCheck, label: "Produtos", value: "Originais" },
              { icon: Zap, label: "Pagamento", value: "Pix na hora" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <Icon size={17} className="text-accent-400" />
                <dt className="mt-2 text-xs text-white/40">{label}</dt>
                <dd className="text-sm font-semibold text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div className="surface relative overflow-hidden p-8">
            <div className="absolute -right-16 -top-16 size-56 rounded-full bg-brand-500/25 blur-3xl" />
            <div className="absolute -bottom-16 -left-10 size-48 rounded-full bg-accent-500/20 blur-3xl" />
            <div className="relative space-y-4">
              {featured.slice(0, 3).map((p, i) => (
                <Link
                  key={p.id}
                  href={`/produto/${p.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/8 bg-ink-850/80 p-3 transition hover:border-brand-400/40"
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500/30 to-accent-500/20 text-sm font-black text-white">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{p.name}</span>
                    <span className="text-xs text-white/45">{p.brand?.name}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-accent-300">{brl(p.priceCents)}</span>
                </Link>
              ))}
              <p className="pt-1 text-center text-xs text-white/35">Mais vendidos da semana</p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- categorias */}
      <section className="py-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/produtos?categoria=${c.slug}`}
              className="surface group p-5 transition hover:border-brand-400/50"
            >
              <h3 className="text-sm font-bold text-white group-hover:text-brand-200">{c.name}</h3>
              <p className="mt-1 text-xs text-white/40">{c._count.products} produtos</p>
            </Link>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- destaques */}
      {featured.length > 0 && (
        <Section title="Destaques" subtitle="Selecionados da loja" href="/produtos">
          <ProductGrid products={featured} priority />
        </Section>
      )}

      {/* --------------------------------------------------------- novidades */}
      <Section title="Chegou agora" subtitle="Últimos produtos cadastrados" href="/produtos?ordem=novidades">
        <ProductGrid products={newest} />
      </Section>

      {/* ------------------------------------------------------------ frete */}
      <section className="my-8">
        <div className="surface flex flex-col items-center gap-3 bg-gradient-to-r from-brand-600/20 to-accent-500/10 p-8 text-center">
          <Truck className="text-accent-300" />
          <h2 className="text-xl font-bold text-white">Frete grátis na cidade</h2>
          <p className="text-sm text-white/50">
            Sem valor mínimo. É só fechar o pedido pelo WhatsApp.
          </p>
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  href,
  children,
}: {
  title: string;
  subtitle?: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
          {subtitle && <p className="text-sm text-white/45">{subtitle}</p>}
        </div>
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-brand-200 hover:text-white"
        >
          Ver todos →
        </Link>
      </div>
      {children}
    </section>
  );
}

function ProductGrid({
  products,
  priority,
}: {
  products: Awaited<ReturnType<typeof getFeaturedProducts>>;
  priority?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={priority && i < 4} />
      ))}
    </div>
  );
}
