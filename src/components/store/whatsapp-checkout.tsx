"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MessageCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/button";
import { createWhatsappOrder } from "@/app/actions/checkout";
import { cartSubtotal, useCart } from "@/lib/cart";
import { buildCartMessage } from "@/lib/order-message";
import { brl, whatsappLink } from "@/lib/utils";

/**
 * Última etapa da compra. O clique grava o pedido (PENDING, sem cadastro) e
 * só então manda o cliente para o WhatsApp com a mensagem pronta, já com o
 * número do pedido — é assim que a conversa e a linha do painel se encontram.
 *
 * A ida é `location.href`, e não `window.open`: depois do `await` do Server
 * Action o navegador trata a abertura de aba como pop-up e bloqueia.
 */
export function WhatsappCheckout({
  whatsapp,
  storeName,
}: {
  whatsapp: string;
  storeName: string;
}) {
  const { items, hydrated, clear } = useCart();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const total = cartSubtotal(items);

  function submit() {
    if (name.trim().length < 2) {
      toast.error("Digite seu nome para a gente te chamar");
      return;
    }

    startTransition(async () => {
      const result = await createWhatsappOrder({
        customerName: name,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const link = whatsappLink(
        whatsapp,
        buildCartMessage(items, storeName, result.orderNumber, name.trim()),
      );
      // Navega antes de limpar: `clear()` primeiro re-renderiza a tela como
      // "carrinho vazio" no instante que antecede a saída da página.
      window.location.href = link;
      clear();
    });
  }

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="surface h-64 animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="surface grid place-items-center gap-4 p-16 text-center">
          <ShoppingBag size={40} className="text-white/25" />
          <h1 className="text-xl font-bold text-white">Seu carrinho está vazio</h1>
          <p className="max-w-sm text-sm text-white/45">
            Escolha os produtos e finalize o pedido pelo WhatsApp.
          </p>
          <ButtonLink href="/produtos" className="mt-2">
            Ver produtos
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-black tracking-tight text-white">Finalizar pedido</h1>
      <p className="mb-6 text-sm text-white/50">
        Confira os itens abaixo. Ao continuar, registramos seu pedido e abrimos o WhatsApp da loja
        com a mensagem já escrita — é só enviar. A entrega e o pagamento a gente combina na conversa.
      </p>

      <section className="surface p-5">
        <ul className="divide-y divide-white/8">
          {items.map((item) => (
            <li key={item.variantId} className="flex items-start gap-3 py-3 first:pt-0">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-white">
                  {item.quantity}x {item.productName}
                </span>
                {item.variantName !== "Padrão" && (
                  <span className="text-xs text-white/45">{item.variantName}</span>
                )}
              </span>
              <span className="text-sm font-bold text-white">
                {brl(item.unitCents * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="my-4 h-px bg-white/8" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">Entrega</span>
          <span className="font-medium text-emerald-300">Grátis em Aracati</span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-sm text-white/50">Total</span>
          <span className="text-2xl font-black text-white">{brl(total)}</span>
        </div>

        <div className="mt-5">
          <label className="label" htmlFor="customer-name">
            Seu nome
          </label>
          <input
            id="customer-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como podemos te chamar?"
            autoComplete="name"
            enterKeyHint="send"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
        </div>

        <Button
          type="button"
          onClick={submit}
          disabled={pending}
          variant="whatsapp"
          size="lg"
          className="mt-3 w-full"
        >
          {pending ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
          {pending ? "Registrando pedido…" : "Enviar pedido no WhatsApp"}
        </Button>

        <Link
          href="/carrinho"
          className="mt-3 block text-center text-xs text-white/45 hover:text-white"
        >
          Voltar ao carrinho
        </Link>
      </section>
    </div>
  );
}
