import type { Settings } from "@/lib/settings";

export type CouponData = {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotalCents: number;
};

/** Desconto em centavos, nunca maior que o próprio subtotal. */
export function couponDiscount(subtotalCents: number, coupon: CouponData | null) {
  if (!coupon || subtotalCents < coupon.minSubtotalCents) return 0;
  const raw =
    coupon.type === "PERCENT" ? Math.round((subtotalCents * coupon.value) / 100) : coupon.value;
  return Math.min(raw, subtotalCents);
}

export function shippingCost(
  settings: Pick<Settings, "freeShippingMinCents" | "flatShippingCents">,
  netCents: number,
  delivery: "DELIVERY" | "PICKUP",
) {
  if (delivery === "PICKUP") return 0;
  if (settings.freeShippingMinCents > 0 && netCents >= settings.freeShippingMinCents) return 0;
  return settings.flatShippingCents;
}

/** Totais do pedido. Fonte única usada pelo checkout e pelo Server Action. */
export function orderTotals({
  subtotalCents,
  coupon,
  settings,
  delivery,
}: {
  subtotalCents: number;
  coupon: CouponData | null;
  settings: Pick<Settings, "freeShippingMinCents" | "flatShippingCents">;
  delivery: "DELIVERY" | "PICKUP";
}) {
  const discountCents = couponDiscount(subtotalCents, coupon);
  const netCents = subtotalCents - discountCents;
  const shippingCents = shippingCost(settings, netCents, delivery);
  return { subtotalCents, discountCents, shippingCents, totalCents: netCents + shippingCents };
}
