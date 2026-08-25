import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { DeleteOrderButton, OrderStatusControls } from "@/components/admin/order-controls";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { buildOrderMessage, formatAddress, PAYMENT_LABELS } from "@/lib/order-message";
import { ORDER_STATUS } from "@/lib/order-labels";
import { brl, formatDate, formatPhone, whatsappLink } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await props.params;
  const order = await db.order.findUnique({ where: { id }, select: { number: true } });
  return { title: order ? `Pedido #${order.number}` : "Pedido" };
}

export default async function PedidoAdminPage(props: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await props.params;
  const [order, settings] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: { items: true, movements: { orderBy: { createdAt: "desc" } } },
    }),
    getSettings(),
  ]);
  if (!order) notFound();

  const status = ORDER_STATUS[order.status];
  const customerMessage = `Olá, ${order.customerName.split(" ")[0]}! Falando da ${settings.storeName} sobre o seu pedido #${order.number}.`;

  return (
    <>
      <Link
        href="/admin/pedidos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={15} /> Voltar aos pedidos
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-white">Pedido #{order.number}</h1>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-white/45">Criado em {formatDate(order.createdAt)}</p>
        </div>
        <DeleteOrderButton orderId={order.id} number={order.number} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr] xl:items-start">
        <div className="space-y-6">
          <section className="surface p-5">
            <OrderStatusControls orderId={order.id} current={order.status} />
            {order.stockApplied && (
              <p className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-xs text-emerald-300">
                O estoque deste pedido já foi debitado.
              </p>
            )}
          </section>

          <section className="surface p-5">
            <h2 className="mb-4 font-bold text-white">Itens</h2>
            <ul className="divide-y divide-white/5">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-3 py-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/8 text-xs font-bold text-white/70">
                    {item.quantity}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-white">{item.productName}</span>
                    <span className="text-xs text-white/40">
                      {item.variantName} · {brl(item.unitCents)} cada
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-white">
                    {brl(item.totalCents)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 border-t border-white/8 pt-4 text-sm">
              <Row label="Subtotal" value={brl(order.subtotalCents)} />
              {order.discountCents > 0 && (
                <Row
                  label={`Desconto${order.couponCode ? ` (${order.couponCode})` : ""}`}
                  value={`−${brl(order.discountCents)}`}
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
          </section>

          {order.movements.length > 0 && (
            <section className="surface p-5">
              <h2 className="mb-3 font-bold text-white">Movimentações de estoque</h2>
              <ul className="divide-y divide-white/5 text-sm">
                {order.movements.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-white/60">{m.reason ?? m.type}</span>
                    <span className="flex items-center gap-3">
                      <span
                        className={m.quantity < 0 ? "text-red-300" : "text-emerald-300"}
                      >
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </span>
                      <span className="text-xs text-white/30">{formatDate(m.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="surface p-5">
            <h2 className="mb-3 font-bold text-white">Cliente</h2>
            <p className="text-sm text-white">{order.customerName}</p>
            {order.customerPhone ? (
              <p className="mt-0.5 text-sm text-white/50">{formatPhone(order.customerPhone)}</p>
            ) : (
              <p className="mt-0.5 text-sm text-white/45">
                O pedido veio do site sem cadastro. O cliente se identifica na conversa do
                WhatsApp — é só procurar a mensagem com <strong>#{order.number}</strong>.
              </p>
            )}
            {order.customerEmail && (
              <p className="mt-0.5 text-sm text-white/50">{order.customerEmail}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {order.customerPhone && (
                <ButtonLink
                  href={whatsappLink(order.customerPhone, customerMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="whatsapp"
                  size="sm"
                >
                  <MessageCircle size={14} /> Falar com o cliente
                </ButtonLink>
              )}
              <CopyButton
                value={buildOrderMessage(order, settings.storeName)}
                label="Copiar resumo"
              />
            </div>
          </section>

          {(order.deliveryMethod === "PICKUP" || order.addressStreet) && (
            <section className="surface p-5">
              <h2 className="mb-3 font-bold text-white">
                {order.deliveryMethod === "PICKUP" ? "Retirada" : "Entrega"}
              </h2>
              <p className="whitespace-pre-line text-sm text-white/65">{formatAddress(order)}</p>
              {order.deliveryMethod === "DELIVERY" && order.addressStreet && (
                <CopyButton
                  value={formatAddress(order).replace(/\n/g, ", ")}
                  label="Copiar endereço"
                />
              )}
            </section>
          )}

          {order.notes && (
            <section className="surface p-5">
              <h2 className="mb-2 font-bold text-white">Observações do cliente</h2>
              <p className="text-sm text-white/65">{order.notes}</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-white/50">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}
