import { brl } from "@/lib/utils";

type OrderForMessage = {
  number: number;
  customerName: string;
  deliveryMethod: "DELIVERY" | "PICKUP";
  paymentMethod: "PIX" | "CASH" | "CARD_ON_DELIVERY";
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode: string | null;
  notes: string | null;
  items: { productName: string; variantName: string; quantity: number; totalCents: number }[];
};

const PAYMENT_LABEL = {
  PIX: "Pix",
  CASH: "Dinheiro na entrega",
  CARD_ON_DELIVERY: "Cartão na entrega",
} as const;

export function formatAddress(order: OrderForMessage) {
  if (order.deliveryMethod === "PICKUP") return "Retirada no local";
  const line1 = [order.addressStreet, order.addressNumber].filter(Boolean).join(", ");
  const line2 = [order.addressComplement, order.addressDistrict].filter(Boolean).join(" · ");
  const line3 = [
    [order.addressCity, order.addressState].filter(Boolean).join("/"),
    order.addressZip,
  ]
    .filter(Boolean)
    .join(" · ");
  return [line1, line2, line3].filter(Boolean).join("\n");
}

/**
 * Mensagem que o cliente envia para a loja no WhatsApp. Texto puro com a
 * formatação do WhatsApp (*negrito*), pronto para ser encodado na URL.
 */
export function buildOrderMessage(order: OrderForMessage, storeName: string) {
  const lines: string[] = [
    `Olá! Acabei de fazer o pedido *#${order.number}* no site da ${storeName}.`,
    "",
    "*Itens*",
    ...order.items.map(
      (i) => `• ${i.quantity}x ${i.productName} (${i.variantName}) — ${brl(i.totalCents)}`,
    ),
    "",
    `Subtotal: ${brl(order.subtotalCents)}`,
  ];

  if (order.discountCents > 0) {
    lines.push(`Desconto${order.couponCode ? ` (${order.couponCode})` : ""}: -${brl(order.discountCents)}`);
  }
  lines.push(
    `Entrega: ${order.shippingCents === 0 ? "Grátis" : brl(order.shippingCents)}`,
    `*Total: ${brl(order.totalCents)}*`,
    "",
    `Pagamento: ${PAYMENT_LABEL[order.paymentMethod]}`,
    order.deliveryMethod === "PICKUP" ? "Retirada no local" : "*Endereço de entrega*",
  );

  if (order.deliveryMethod === "DELIVERY") lines.push(formatAddress(order));
  if (order.notes) lines.push("", `Obs.: ${order.notes}`);
  lines.push("", `Nome: ${order.customerName}`);

  return lines.join("\n");
}

export const PAYMENT_LABELS = PAYMENT_LABEL;

export type CartLine = {
  productName: string;
  variantName: string;
  quantity: number;
  unitCents: number;
};

/**
 * Mensagem montada direto do carrinho, sem pedido gravado no banco: quem
 * fecha a venda é a conversa no WhatsApp. Por isso não há número de pedido,
 * endereço nem forma de pagamento aqui — tudo isso se combina no papo.
 */
export function buildCartMessage(items: CartLine[], storeName: string) {
  const total = items.reduce((sum, i) => sum + i.unitCents * i.quantity, 0);

  return [
    `Olá! Quero fazer um pedido na ${storeName}.`,
    "",
    "*Itens*",
    ...items.map((i) => {
      const name =
        i.variantName && i.variantName !== "Padrão"
          ? `${i.productName} (${i.variantName})`
          : i.productName;
      return `• ${i.quantity}x ${name} — ${brl(i.unitCents * i.quantity)}`;
    }),
    "",
    `*Total: ${brl(total)}*`,
    "Entrega grátis.",
  ].join("\n");
}
