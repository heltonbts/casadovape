"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cartSubtotal, useCart } from "@/lib/cart";
import { brl } from "@/lib/utils";

export function CartView() {
  const { items, hydrated, setQuantity, remove } = useCart();
  const subtotal = cartSubtotal(items);

  if (!hydrated) {
    return <div className="mx-auto max-w-5xl px-4 py-16"><div className="surface h-64 animate-pulse" /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="surface grid place-items-center gap-4 p-16 text-center">
          <ShoppingBag size={40} className="text-white/25" />
          <h1 className="text-xl font-bold text-white">Seu carrinho está vazio</h1>
          <p className="max-w-sm text-sm text-white/45">
            Dá uma olhada nos destaques da loja — tem pod novo chegando toda semana.
          </p>
          <ButtonLink href="/produtos" className="mt-2">
            Ver produtos
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-black tracking-tight text-white">Seu carrinho</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.variantId} className="surface flex gap-4 p-4">
              <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-ink-800 to-ink-700 text-sm font-black text-brand-200">
                {item.productName.slice(0, 2).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/produto/${item.slug}`}
                  className="line-clamp-2 text-sm font-semibold text-white hover:text-brand-200"
                >
                  {item.productName}
                </Link>
                <p className="text-xs text-white/45">{item.variantName}</p>
                <p className="mt-1 text-sm font-bold text-white">{brl(item.unitCents)}</p>

                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center rounded-lg border border-white/12">
                    <button
                      type="button"
                      aria-label="Diminuir quantidade"
                      onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                      className="grid size-8 place-items-center text-white/60 hover:bg-white/5"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-white">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label="Aumentar quantidade"
                      disabled={item.quantity >= item.maxStock}
                      onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                      className="grid size-8 place-items-center text-white/60 hover:bg-white/5 disabled:opacity-30"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(item.variantId)}
                    className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-red-300"
                  >
                    <Trash2 size={13} /> Remover
                  </button>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-white">{brl(item.unitCents * item.quantity)}</p>
                {item.quantity >= item.maxStock && (
                  <p className="mt-1 text-[11px] text-amber-300">máx. em estoque</p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <aside className="surface sticky top-32 p-5">
          <h2 className="text-sm font-bold text-white">Resumo</h2>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/50">Subtotal</dt>
              <dd className="text-white">{brl(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-white/50">Entrega</dt>
              <dd className="text-emerald-300">Grátis em Aracati</dd>
            </div>
          </dl>

          <div className="my-4 h-px bg-white/8" />

          <div className="flex items-end justify-between">
            <span className="text-sm text-white/50">Total</span>
            <span className="text-2xl font-black text-white">{brl(subtotal)}</span>
          </div>

          <ButtonLink href="/checkout" size="lg" className="mt-5 w-full">
            Finalizar pedido
          </ButtonLink>
          <p className="mt-3 text-center text-xs text-white/35">
            O pedido é fechado pelo WhatsApp, na próxima etapa.
          </p>
          <Link
            href="/produtos"
            className="mt-3 block text-center text-xs text-white/45 hover:text-white"
          >
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
