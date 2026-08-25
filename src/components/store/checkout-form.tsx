"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, ShoppingBag, Store, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createOrder, validateCoupon } from "@/app/actions/checkout";
import { cartSubtotal, useCart } from "@/lib/cart";
import { orderTotals, type CouponData } from "@/lib/pricing";
import { brl, cn, formatPhone, formatZip, onlyDigits } from "@/lib/utils";

type Delivery = "DELIVERY" | "PICKUP";
type Payment = "PIX" | "CASH" | "CARD_ON_DELIVERY";

const PAYMENTS: { value: Payment; label: string; hint: string }[] = [
  { value: "PIX", label: "Pix", hint: "Chave enviada ao confirmar" },
  { value: "CASH", label: "Dinheiro", hint: "Pagamento na entrega" },
  { value: "CARD_ON_DELIVERY", label: "Cartão", hint: "Maquininha na entrega" },
];

export function CheckoutForm({
  freeShippingMinCents,
  flatShippingCents,
  storeAddress,
  hasPix,
}: {
  freeShippingMinCents: number;
  flatShippingCents: number;
  storeAddress: string | null;
  hasPix: boolean;
}) {
  const router = useRouter();
  const { items, hydrated, clear } = useCart();
  const [pending, startTransition] = useTransition();

  const [delivery, setDelivery] = useState<Delivery>("DELIVERY");
  const [payment, setPayment] = useState<Payment>(hasPix ? "PIX" : "CASH");
  const [coupon, setCoupon] = useState<CouponData | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zipLoading, setZipLoading] = useState(false);
  // Pedido enviado: o carrinho já foi limpo e estamos navegando para a página
  // de confirmação. Sem essa trava, o efeito abaixo veria o carrinho vazio e
  // redirecionaria de volta para /carrinho no meio da navegação.
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    zip: "",
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: "",
    notes: "",
  });

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const subtotal = cartSubtotal(items);
  const totals = orderTotals({
    subtotalCents: subtotal,
    coupon,
    settings: { freeShippingMinCents, flatShippingCents },
    delivery,
  });

  // Carrinho esvaziado (ex.: em outra aba) manda o cliente de volta.
  useEffect(() => {
    if (hydrated && items.length === 0 && !pending && !submitted) router.replace("/carrinho");
  }, [hydrated, items.length, pending, submitted, router]);

  /** Autocompleta o endereço pelo CEP usando a API pública ViaCEP. */
  async function lookupZip(value: string) {
    const digits = onlyDigits(value);
    if (digits.length !== 8) return;
    setZipLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setForm((f) => ({
          ...f,
          street: data.logradouro || f.street,
          district: data.bairro || f.district,
          city: data.localidade || f.city,
          state: data.uf || f.state,
        }));
      }
    } catch {
      // CEP é conveniência: se a API falhar, o cliente digita à mão.
    } finally {
      setZipLoading(false);
    }
  }

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    setCouponError(null);
    const result = await validateCoupon(couponInput, subtotal);
    if (result.ok) {
      setCoupon(result.coupon);
      toast.success(`Cupom ${result.coupon.code} aplicado`);
    } else {
      setCoupon(null);
      setCouponError(result.error);
    }
    setCheckingCoupon(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createOrder({
        ...form,
        deliveryMethod: delivery,
        paymentMethod: payment,
        couponCode: coupon?.code,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      });

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setSubmitted(true);
      clear();
      router.push(`/pedido/${result.orderId}`);
    });
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="surface grid place-items-center gap-3 p-14 text-center">
          <Loader2 size={28} className="animate-spin text-brand-400" />
          <p className="font-semibold text-white">Pedido registrado! Abrindo a confirmação…</p>
        </div>
      </div>
    );
  }

  if (!hydrated || items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="surface h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-black tracking-tight text-white">Finalizar pedido</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-4">
          {/* ------------------------------------------------------ contato */}
          <section className="surface p-5">
            <h2 className="mb-4 text-sm font-bold text-white">1. Seus dados</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="name">Nome completo *</label>
                <input
                  id="name"
                  className="field"
                  required
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="Como devemos te chamar"
                />
              </div>
              <div>
                <label className="label" htmlFor="phone">WhatsApp *</label>
                <input
                  id="phone"
                  className="field"
                  required
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => set("phone")(formatPhone(e.target.value))}
                  placeholder="(11) 90000-0000"
                />
              </div>
              <div>
                <label className="label" htmlFor="email">E-mail (opcional)</label>
                <input
                  id="email"
                  type="email"
                  className="field"
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------ entrega */}
          <section className="surface p-5">
            <h2 className="mb-4 text-sm font-bold text-white">2. Entrega</h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceCard
                selected={delivery === "DELIVERY"}
                onClick={() => setDelivery("DELIVERY")}
                icon={<Truck size={18} />}
                title="Entrega"
                hint={
                  freeShippingMinCents > 0
                    ? `Grátis acima de ${brl(freeShippingMinCents)}`
                    : brl(flatShippingCents)
                }
              />
              <ChoiceCard
                selected={delivery === "PICKUP"}
                onClick={() => setDelivery("PICKUP")}
                icon={<Store size={18} />}
                title="Retirar no local"
                hint={storeAddress ?? "Sem custo"}
              />
            </div>

            {delivery === "DELIVERY" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="zip">CEP</label>
                  <div className="relative">
                    <input
                      id="zip"
                      className="field"
                      inputMode="numeric"
                      value={form.zip}
                      onChange={(e) => {
                        const v = formatZip(e.target.value);
                        set("zip")(v);
                        void lookupZip(v);
                      }}
                      placeholder="00000-000"
                    />
                    {zipLoading && (
                      <Loader2
                        size={15}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/40"
                      />
                    )}
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <label className="label" htmlFor="street">Rua *</label>
                  <input id="street" className="field" value={form.street} onChange={(e) => set("street")(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="number">Número *</label>
                  <input id="number" className="field" value={form.number} onChange={(e) => set("number")(e.target.value)} />
                </div>
                <div className="sm:col-span-4">
                  <label className="label" htmlFor="complement">Complemento</label>
                  <input id="complement" className="field" value={form.complement} onChange={(e) => set("complement")(e.target.value)} placeholder="Apto, bloco, referência" />
                </div>
                <div className="sm:col-span-3">
                  <label className="label" htmlFor="district">Bairro *</label>
                  <input id="district" className="field" value={form.district} onChange={(e) => set("district")(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="city">Cidade *</label>
                  <input id="city" className="field" value={form.city} onChange={(e) => set("city")(e.target.value)} />
                </div>
                <div className="sm:col-span-1">
                  <label className="label" htmlFor="state">UF</label>
                  <input id="state" className="field" maxLength={2} value={form.state} onChange={(e) => set("state")(e.target.value.toUpperCase())} />
                </div>
              </div>
            )}
          </section>

          {/* --------------------------------------------------- pagamento */}
          <section className="surface p-5">
            <h2 className="mb-4 text-sm font-bold text-white">3. Pagamento</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {PAYMENTS.filter((p) => p.value !== "PIX" || hasPix).map((p) => (
                <ChoiceCard
                  key={p.value}
                  selected={payment === p.value}
                  onClick={() => setPayment(p.value)}
                  title={p.label}
                  hint={p.hint}
                />
              ))}
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="notes">Observações do pedido</label>
              <textarea
                id="notes"
                className="field min-h-20 resize-y"
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
                placeholder="Ex.: precisa de troco para R$ 200, entregar após as 18h…"
              />
            </div>
          </section>
        </div>

        {/* --------------------------------------------------------- resumo */}
        <aside className="surface sticky top-32 p-5">
          <h2 className="text-sm font-bold text-white">Seu pedido</h2>

          <ul className="mt-4 space-y-2.5">
            {items.map((i) => (
              <li key={i.variantId} className="flex gap-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white/8 text-[11px] font-bold text-white/70">
                  {i.quantity}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-white/85">{i.productName}</span>
                  <span className="text-xs text-white/40">{i.variantName}</span>
                </span>
                <span className="shrink-0 text-white/85">{brl(i.unitCents * i.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-white/8 pt-4">
            <label className="label" htmlFor="coupon">Cupom de desconto</label>
            <div className="flex gap-2">
              <input
                id="coupon"
                className="field uppercase"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="PIX10"
              />
              <Button
                type="button"
                variant="outline"
                onClick={applyCoupon}
                disabled={checkingCoupon || !couponInput.trim()}
              >
                {checkingCoupon ? <Loader2 size={15} className="animate-spin" /> : "Aplicar"}
              </Button>
            </div>
            {couponError && <p className="mt-1.5 text-xs text-red-300">{couponError}</p>}
            {coupon && (
              <p className="mt-1.5 text-xs text-emerald-300">
                Cupom {coupon.code} aplicado ·{" "}
                {coupon.type === "PERCENT" ? `${coupon.value}% off` : `${brl(coupon.value)} off`}
              </p>
            )}
          </div>

          <dl className="mt-4 space-y-2 border-t border-white/8 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-white/50">Subtotal</dt>
              <dd className="text-white">{brl(totals.subtotalCents)}</dd>
            </div>
            {totals.discountCents > 0 && (
              <div className="flex justify-between">
                <dt className="text-white/50">Desconto</dt>
                <dd className="text-emerald-300">−{brl(totals.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-white/50">Entrega</dt>
              <dd className={totals.shippingCents === 0 ? "text-emerald-300" : "text-white"}>
                {totals.shippingCents === 0 ? "Grátis" : brl(totals.shippingCents)}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-end justify-between border-t border-white/8 pt-4">
            <span className="text-sm text-white/50">Total</span>
            <span className="text-2xl font-black text-white">{brl(totals.totalCents)}</span>
          </div>

          {error && (
            <p className="mt-4 flex gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              <AlertCircle size={14} className="mt-px shrink-0" /> {error}
            </p>
          )}

          <Button type="submit" size="lg" className="mt-4 w-full" disabled={pending}>
            {pending ? <Loader2 size={17} className="animate-spin" /> : <ShoppingBag size={17} />}
            {pending ? "Enviando…" : "Confirmar pedido"}
          </Button>

          <p className="mt-3 text-center text-xs text-white/35">
            Você será direcionado ao WhatsApp para concluir o pagamento.
          </p>
          <Link href="/carrinho" className="mt-2 block text-center text-xs text-white/45 hover:text-white">
            Voltar ao carrinho
          </Link>
        </aside>
      </div>
    </form>
  );
}

function ChoiceCard({
  selected,
  onClick,
  icon,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3.5 text-left transition",
        selected
          ? "border-brand-400 bg-brand-500/12"
          : "border-white/10 hover:border-white/25",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-white">
        {icon}
        {title}
      </span>
      <span className="mt-0.5 block truncate text-xs text-white/45">{hint}</span>
    </button>
  );
}
