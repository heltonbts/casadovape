"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { orderTotals, type CouponData } from "@/lib/pricing";
import { onlyDigits } from "@/lib/utils";

const itemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});

const checkoutSchema = z.object({
  name: z.string().trim().min(3, "Informe seu nome completo"),
  phone: z.string().transform(onlyDigits).pipe(z.string().min(10, "Telefone inválido").max(11)),
  email: z.union([z.email("E-mail inválido"), z.literal("")]).optional(),
  deliveryMethod: z.enum(["DELIVERY", "PICKUP"]),
  paymentMethod: z.enum(["PIX", "CASH", "CARD_ON_DELIVERY"]),
  zip: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().max(500).optional(),
  couponCode: z.string().optional(),
  items: z.array(itemSchema).min(1, "Seu carrinho está vazio"),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutResult =
  | { ok: true; orderId: string; orderNumber: number }
  | { ok: false; error: string; field?: string };

/** Busca um cupom válido. Retorna null quando o código não serve. */
async function findValidCoupon(code: string | undefined): Promise<CouponData | null> {
  if (!code?.trim()) return null;
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!coupon || !coupon.active) return null;
  if (coupon.expiresAt && coupon.expiresAt < new Date()) return null;
  if (coupon.maxUses !== null && coupon.uses >= coupon.maxUses) return null;
  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    minSubtotalCents: coupon.minSubtotalCents,
  };
}

export async function validateCoupon(code: string, subtotalCents: number) {
  const coupon = await findValidCoupon(code);
  if (!coupon) return { ok: false as const, error: "Cupom inválido ou expirado" };
  if (subtotalCents < coupon.minSubtotalCents) {
    return {
      ok: false as const,
      error: `Este cupom vale para compras a partir de ${(coupon.minSubtotalCents / 100).toLocaleString(
        "pt-BR",
        { style: "currency", currency: "BRL" },
      )}`,
    };
  }
  return { ok: true as const, coupon };
}

/**
 * Cria o pedido. Preço, estoque e desconto são SEMPRE recalculados no
 * servidor a partir do banco — o carrinho do cliente é só uma sugestão de
 * quais variantes e quantidades ele quer.
 *
 * O estoque não é debitado aqui: a baixa acontece quando o pedido é marcado
 * como pago no admin (fluxo WhatsApp/Pix, em que o pagamento é confirmado
 * manualmente).
 */
export async function createOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  const data = parsed.data;

  if (data.deliveryMethod === "DELIVERY") {
    const missing = [
      !data.street?.trim() && "rua",
      !data.number?.trim() && "número",
      !data.district?.trim() && "bairro",
      !data.city?.trim() && "cidade",
    ].filter(Boolean);
    if (missing.length) {
      return { ok: false, error: `Preencha o endereço de entrega (${missing.join(", ")})`, field: "street" };
    }
  }

  const variants = await db.productVariant.findMany({
    where: { id: { in: data.items.map((i) => i.variantId) }, active: true },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          active: true,
          priceCents: true,
          images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
        },
      },
    },
  });

  const lines = [];
  for (const item of data.items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant || !variant.product.active) {
      return { ok: false, error: "Um dos produtos do carrinho não está mais disponível" };
    }
    if (variant.stock < item.quantity) {
      return {
        ok: false,
        error:
          variant.stock === 0
            ? `${variant.product.name} (${variant.name}) esgotou`
            : `Só restam ${variant.stock} unidades de ${variant.product.name} (${variant.name})`,
      };
    }
    const unitCents = variant.priceCents ?? variant.product.priceCents;
    lines.push({
      productId: variant.product.id,
      variantId: variant.id,
      productName: variant.product.name,
      variantName: variant.name,
      imageUrl: variant.product.images[0]?.url ?? null,
      unitCents,
      quantity: item.quantity,
      totalCents: unitCents * item.quantity,
    });
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const settings = await getSettings();
  const coupon = await findValidCoupon(data.couponCode);
  const totals = orderTotals({ subtotalCents, coupon, settings, delivery: data.deliveryMethod });

  const customer = await db.customer.upsert({
    where: { phone: data.phone },
    update: { name: data.name, email: data.email || undefined },
    create: { name: data.name, phone: data.phone, email: data.email || null },
  });

  const order = await db.order.create({
    data: {
      customerId: customer.id,
      customerName: data.name,
      customerPhone: data.phone,
      customerEmail: data.email || null,
      deliveryMethod: data.deliveryMethod,
      paymentMethod: data.paymentMethod,
      addressZip: data.zip || null,
      addressStreet: data.street || null,
      addressNumber: data.number || null,
      addressComplement: data.complement || null,
      addressDistrict: data.district || null,
      addressCity: data.city || null,
      addressState: data.state || null,
      notes: data.notes || null,
      couponCode: totals.discountCents > 0 ? (coupon?.code ?? null) : null,
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      shippingCents: totals.shippingCents,
      totalCents: totals.totalCents,
      items: { create: lines },
    },
  });

  if (coupon && totals.discountCents > 0) {
    await db.coupon.update({ where: { code: coupon.code }, data: { uses: { increment: 1 } } });
  }

  return { ok: true, orderId: order.id, orderNumber: order.number };
}
