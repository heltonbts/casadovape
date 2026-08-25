"use client";

import Link from "next/link";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { cartSubtotal, useCart } from "@/lib/cart";
import { buildCartMessage } from "@/lib/order-message";
import { brl, whatsappLink } from "@/lib/utils";

/**
 * Última etapa da compra: em vez de formulário e pedido no banco, monta a
 * mensagem com os itens do carrinho e entrega a conversa para o WhatsApp da
 * loja. O carrinho NÃO é limpo no clique — se o WhatsApp não abrir, o cliente
 * perderia tudo sem ter enviado nada.
 */
export function WhatsappCheckout({
  whatsapp,
  storeName,
}: {
  whatsapp: string;
  storeName: string;
}) {
  const { items, hydrated } = useCart();
  const total = cartSubtotal(items);

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

  const link = whatsappLink(whatsapp, buildCartMessage(items, storeName));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-black tracking-tight text-white">Finalizar pedido</h1>
      <p className="mb-6 text-sm text-white/50">
        Confira os itens abaixo. Ao continuar, abrimos o WhatsApp da loja com a mensagem do seu
        pedido já escrita — é só enviar. A entrega e o pagamento a gente combina na conversa.
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
          <span className="font-medium text-emerald-300">Grátis</span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <span className="text-sm text-white/50">Total</span>
          <span className="text-2xl font-black text-white">{brl(total)}</span>
        </div>

        <ButtonLink
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          variant="whatsapp"
          size="lg"
          className="mt-5 w-full"
        >
          <MessageCircle size={18} />
          Enviar pedido no WhatsApp
        </ButtonLink>

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
