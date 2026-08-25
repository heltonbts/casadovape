"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Menu, Search, ShoppingBag, X, Zap } from "lucide-react";
import { cartCount, useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

type NavCategory = { name: string; slug: string };

export function SiteHeader({
  storeName,
  announcement,
  categories,
}: {
  storeName: string;
  announcement?: string | null;
  categories: NavCategory[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const count = cartCount(items);

  const closeMenu = () => setMenuOpen(false);

  function onSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get("q");
    router.push(q ? `/produtos?q=${encodeURIComponent(String(q))}` : "/produtos");
  }

  return (
    <header className="sticky top-0 z-40">
      {announcement && (
        <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 px-4 py-1.5 text-center text-xs font-medium text-white">
          {announcement}
        </div>
      )}

      <div className="border-b border-white/8 bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            className="grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/5 lg:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 shadow-lg shadow-brand-600/30">
              <Zap size={18} className="text-white" fill="currentColor" />
            </span>
            <span className="text-base font-black tracking-tight text-white sm:text-lg">
              {storeName}
            </span>
          </Link>

          <form onSubmit={onSearch} className="ml-2 hidden max-w-md flex-1 lg:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
              <input
                name="q"
                defaultValue={searchParams.get("q") ?? ""}
                placeholder="Buscar pod, sabor ou marca…"
                className="field pl-9"
                aria-label="Buscar produtos"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/produtos"
              className="hidden rounded-xl px-3 py-2 text-sm font-medium text-white/70 hover:text-white lg:block"
            >
              Todos os produtos
            </Link>
            <Link
              href="/carrinho"
              aria-label={`Carrinho com ${count} ${count === 1 ? "item" : "itens"}`}
              className="relative grid size-11 place-items-center rounded-xl text-white/80 hover:bg-white/5 hover:text-white"
            >
              <ShoppingBag size={20} />
              {hydrated && count > 0 && (
                <span className="absolute right-1 top-1 grid min-w-5 place-items-center rounded-full bg-accent-400 px-1 text-[10px] font-bold text-ink-950">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Categorias — rola horizontalmente no mobile */}
        <nav className="no-scrollbar hidden gap-1 overflow-x-auto border-t border-white/5 px-4 py-2 lg:flex lg:justify-center">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/produtos?categoria=${c.slug}`}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white",
                searchParams.get("categoria") === c.slug && "bg-brand-500/15 text-brand-200",
              )}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>

      {menuOpen && (
        <div className="border-b border-white/8 bg-ink-900/98 px-4 pb-5 pt-3 backdrop-blur-xl lg:hidden">
          <form onSubmit={onSearch} className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input name="q" placeholder="Buscar…" className="field pl-9" aria-label="Buscar produtos" />
          </form>
          <div className="flex flex-col">
            <Link
              href="/produtos"
              onClick={closeMenu}
              className="rounded-lg px-2 py-2.5 font-medium text-white"
            >
              Todos os produtos
            </Link>
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/produtos?categoria=${c.slug}`}
                onClick={closeMenu}
                className="rounded-lg px-2 py-2.5 text-white/70"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
