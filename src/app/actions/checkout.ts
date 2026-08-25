"use server";

import { z } from "zod";
import { db } from "@/lib/db";

const itemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive().max(99),
});

const orderSchema = z.object({
  items: z.array(itemSchema).min(1, "Seu carrinho está vazio"),
});

export type WhatsappOrderInput = z.input<typeof orderSchema>;
export type WhatsappOrderResult =
  | { ok: true; orderId: string; orderNumber: number }
  | { ok: false; error: string };

/**
 * Registra o pedido no instante em que o cliente vai para o WhatsApp. Ele
 * nasce PENDING e sem dado nenhum de cadastro — quem o cliente é, como paga e
 * onde recebe se resolve na conversa. O número do pedido vai na mensagem, e é
 * ele que amarra o papo à linha em /admin/pedidos.
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
          images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
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

  const order = await db.order.create({
    data: {
      // Sem formulário não há cadastro; o painel mostra isso como pendente de
      // identificação e o lojista completa pela conversa se quiser.
      customerName: "Cliente do WhatsApp",
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
