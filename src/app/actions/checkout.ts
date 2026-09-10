"use server";

import { z } from "zod";
import { comboStock } from "@/lib/combo";
import { db } from "@/lib/db";

const itemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});

const orderSchema = z.object({
  customerName: z.string().trim().min(2, "Digite seu nome para a gente te chamar"),
  items: z.array(itemSchema).min(1, "Seu carrinho está vazio"),
});

export type WhatsappOrderInput = z.input<typeof orderSchema>;
export type WhatsappOrderResult =
  | { ok: true; orderId: string; orderNumber: number }
  | { ok: false; error: string };

/**
 * Registra o pedido no instante em que o cliente vai para o WhatsApp. Ele
 * nasce PENDING com o nome que o cliente digitou; como paga e onde recebe se
 * resolve na conversa. O número do pedido vai na mensagem, e é ele que amarra
 * o papo à linha em /admin/pedidos.
 *
 * Preço e disponibilidade são SEMPRE relidos do banco: o carrinho do cliente
 * mora no localStorage dele e só serve para dizer o que ele quer.
 *
 * O estoque não é debitado aqui. A baixa acontece quando o pedido é marcado
 * como pago/entregue no painel — antes disso a venda ainda pode não acontecer.
 */
export async function createWhatsappOrder(
  input: WhatsappOrderInput,
): Promise<WhatsappOrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const variants = await db.productVariant.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.variantId) }, active: true },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          active: true,
          priceCents: true,
          isCombo: true,
          images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
          comboItems: {
            select: {
              quantity: true,
              variant: {
                select: { stock: true, name: true, product: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  const lines = [];
  for (const item of parsed.data.items) {
    const variant = variants.find((v) => v.id === item.variantId);
    if (!variant || !variant.product.active) {
      return { ok: false, error: "Um dos produtos do carrinho não está mais disponível" };
    }
    // Combo não tem estoque próprio: o que limita é o item mais escasso lá
    // dentro, e é ele que o cliente precisa ver no aviso.
    const available = variant.product.isCombo
      ? comboStock(variant.product.comboItems)
      : variant.stock;

    if (available < item.quantity) {
      const scarcest = variant.product.isCombo
        ? [...variant.product.comboItems].sort(
            (a, b) =>
              Math.floor(a.variant.stock / Math.max(1, a.quantity)) -
              Math.floor(b.variant.stock / Math.max(1, b.quantity)),
          )[0]
        : null;
      const label = scarcest
        ? `${scarcest.variant.product.name} (${scarcest.variant.name})`
        : `${variant.product.name} (${variant.name})`;

      return {
        ok: false,
        error:
          available === 0
            ? variant.product.isCombo
              ? `O combo ${variant.product.name} esgotou — acabou o ${label}`
              : `${label} esgotou`
            : `Só ${available > 1 ? `restam ${available} unidades` : "resta 1 unidade"} de ${variant.product.name}`,
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

  const order = await db.order.create({
    data: {
      // O nome é a única coisa que pedimos; telefone, endereço e pagamento
      // saem da própria conversa no WhatsApp.
      customerName: parsed.data.customerName,
      customerPhone: "",
      subtotalCents,
      // Frete grátis na cidade: não existe cálculo de entrega em lugar nenhum.
      shippingCents: 0,
      totalCents: subtotalCents,
      items: { create: lines },
    },
  });

  return { ok: true, orderId: order.id, orderNumber: order.number };
}
