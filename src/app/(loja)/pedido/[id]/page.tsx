import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { buildOrderMessage, formatAddress, PAYMENT_LABELS } from "@/lib/order-message";
import { brl, whatsappLink } from "@/lib/utils";

export const metadata = { title: "Pedido confirmado" };

export default async function PedidoPage(props: PageProps<"/pedido/[id]">) {
  const { id } = await props.params;
  const [order, settings] = await Promise.all([
    db.order.findUnique({ where: { id }, include: { items: true } }),
    getSettings(),
  ]);
  if (!order) notFound();

  const message = buildOrderMessage(order, settings.storeName);
  const waLink = whatsappLink(settings.whatsapp, message);
  const showPix = order.paymentMethod === "PIX" && Boolean(settings.pixKey);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="surface p-7 text-center">
        <CheckCircle2 size={44} className="mx-auto text-emerald-400" />
        <h1 className="mt-4 text-2xl font-black text-white">Pedido #{order.number} registrado!</h1>
        <p className="mt-2 text-sm text-white/55">
          Falta só um passo: envie o resumo no WhatsApp para a gente confirmar o pagamento e
          separar seus produtos.
        </p>

        <ButtonLink
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          variant="whatsapp"
          size="lg"
          className="mt-6 w-full"
        >
          <MessageCircle size={18} /> Enviar pedido no WhatsApp
        </ButtonLink>

        <p className="mt-3 text-xs text-white/35">
          Guarde este link — ele mostra o resumo do seu pedido a qualquer momento.
        </p>
      </div>

      {showPix && (
        <div className="surface mt-4 p-6">
          <h2 className="text-sm font-bold text-white">Pagar com Pix</h2>
          <p className="mt-1 text-sm text-white/50">
            Transfira {brl(order.totalCents)} para a chave abaixo e envie o comprovante no
            WhatsApp.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-ink-850 p-3">
            <code className="min-w-0 flex-1 truncate text-sm text-accent-300">{settings.pixKey}</code>
            <CopyButton value={settings.pixKey!} label="Copiar chave" />
          </div>
          {settings.pixHolder && (
            <p className="mt-2 text-xs text-white/40">Titular: {settings.pixHolder}</p>
          )}
        </div>
      )}

      <div className="surface mt-4 p-6">
        <h2 className="text-sm font-bold text-white">Resumo do pedido</h2>

        <ul className="mt-4 space-y-2.5">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/8 text-[11px] font-bold text-white/70">
                {item.quantity}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-white/85">{item.productName}</span>
                <span className="text-xs text-white/40">{item.variantName}</span>
              </span>
              <span className="shrink-0 text-white/85">{brl(item.totalCents)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-white/8 pt-4 text-sm">
          <Row label="Subtotal" value={brl(order.subtotalCents)} />
          {order.discountCents > 0 && (
            <Row
              label={`Desconto${order.couponCode ? ` (${order.couponCode})` : ""}`}
              value={`−${brl(order.discountCents)}`}
              tone="text-emerald-300"
            />
          )}
          <Row
            label="Entrega"
            value={order.shippingCents === 0 ? "Grátis" : brl(order.shippingCents)}
          />
          <Row label="Pagamento" value={PAYMENT_LABELS[order.paymentMethod]} />
        </dl>

        <div className="mt-4 flex items-end justify-between border-t border-white/8 pt-4">
          <span className="text-sm text-white/50">Total</span>
          <span className="text-2xl font-black text-white">{brl(order.totalCents)}</span>
        </div>

        <div className="mt-5 border-t border-white/8 pt-4 text-sm">
          <h3 className="text-xs uppercase tracking-wide text-white/40">
            {order.deliveryMethod === "PICKUP" ? "Retirada" : "Entrega"}
          </h3>
          <p className="mt-1 whitespace-pre-line text-white/70">{formatAddress(order)}</p>
          {order.notes && <p className="mt-3 text-white/50">Obs.: {order.notes}</p>}
        </div>
      </div>

      <Link href="/produtos" className="mt-6 block text-center text-sm text-white/45 hover:text-white">
        Continuar comprando →
      </Link>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-white/50">{label}</dt>
      <dd className={tone ?? "text-white"}>{value}</dd>
    </div>
  );
}
