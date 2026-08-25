"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { brl, cn } from "@/lib/utils";

export type VariantOption = {
  id: string;
  name: string;
  stock: number;
  priceCents: number | null;
};

export function AddToCart({
  productId,
  slug,
  productName,
  basePriceCents,
  variants,
}: {
  productId: string;
  slug: string;
  productName: string;
  basePriceCents: number;
  variants: VariantOption[];
}) {
  const router = useRouter();
  const add = useCart((s) => s.add);

  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = variants.find((v) => v.id === variantId);
  const unitCents = variant?.priceCents ?? basePriceCents;
  const soldOut = !variant || variant.stock === 0;
  const onlyDefault = variants.length === 1 && variants[0]?.name === "Padrão";

  function handleAdd(goToCart = false) {
    if (!variant || variant.stock === 0) return;
    add(
      {
        variantId: variant.id,
        productId,
        slug,
        productName,
        variantName: variant.name,
        unitCents,
        maxStock: variant.stock,
      },
      quantity,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    if (goToCart) router.push("/carrinho");
    else toast.success(`${productName} adicionado ao carrinho`);
  }

  return (
    <div className="space-y-5">
      {!onlyDefault && (
        <div>
          <span className="label">Escolha o sabor / modelo</span>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const out = v.stock === 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={out}
                  onClick={() => {
                    setVariantId(v.id);
                    setQuantity(1);
                  }}
                  className={cn(
                    "rounded-xl border px-3.5 py-2 text-sm transition",
                    v.id === variantId
                      ? "border-brand-400 bg-brand-500/15 font-semibold text-white"
                      : "border-white/12 text-white/70 hover:border-white/30",
                    out && "cursor-not-allowed line-through opacity-35 hover:border-white/12",
                  )}
                >
                  {v.name}
                  {v.priceCents !== null && v.priceCents !== basePriceCents && (
                    <span className="ml-1.5 text-xs text-accent-300">{brl(v.priceCents)}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <span className="label">Quantidade</span>
          <div className="flex items-center gap-1 rounded-xl border border-white/12 p-1">
            <button
              type="button"
              aria-label="Diminuir"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={soldOut || quantity <= 1}
              className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/5 disabled:opacity-30"
            >
              <Minus size={15} />
            </button>
            <span className="w-9 text-center text-sm font-semibold text-white">{quantity}</span>
            <button
              type="button"
              aria-label="Aumentar"
              onClick={() => setQuantity((q) => Math.min(variant?.stock ?? 1, q + 1))}
              disabled={soldOut || quantity >= (variant?.stock ?? 0)}
              className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/5 disabled:opacity-30"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1">
          <span className="label">Total</span>
          <p className="text-2xl font-black text-white">{brl(unitCents * quantity)}</p>
        </div>
      </div>

      {soldOut ? (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Produto esgotado. Fale com a gente no WhatsApp para saber da próxima reposição.
        </div>
      ) : (
        <>
          {variant.stock <= 5 && (
            <p className="text-sm text-amber-300">Últimas unidades de {variant.name}.</p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="flex-1" onClick={() => handleAdd(true)}>
              Comprar agora
            </Button>
            <Button variant="outline" size="lg" className="flex-1" onClick={() => handleAdd(false)}>
              {added ? <Check size={17} /> : <ShoppingBag size={17} />}
              {added ? "Adicionado" : "Adicionar ao carrinho"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
