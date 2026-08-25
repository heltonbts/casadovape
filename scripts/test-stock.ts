import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

/**
 * Teste de integração do controle de estoque.
 * Roda contra o banco do .env e limpa o pedido que cria.
 * Uso: npm run test:stock
 */

async function main() {
  const user = await db.adminUser.findFirstOrThrow();
  // O teste cria o próprio pedido, do jeito que a loja cria: PENDING e sem
  // cadastro do cliente. Depender de um pedido que já esteja no banco tornava
  // o teste refém do estado dele (produto excluído zera `variantId`).
  const seedVariant = await db.productVariant.findFirstOrThrow({
    where: { active: true, stock: { gt: 0 }, product: { active: true } },
    include: { product: { select: { id: true, name: true, priceCents: true } } },
  });
  const qty = Math.min(2, seedVariant.stock);
  const unitCents = seedVariant.priceCents ?? seedVariant.product.priceCents;

  const order = await db.order.create({
    data: {
      customerName: "Cliente do WhatsApp",
      customerPhone: "",
      subtotalCents: unitCents * qty,
      totalCents: unitCents * qty,
      items: {
        create: [
          {
            productId: seedVariant.product.id,
            variantId: seedVariant.id,
            productName: seedVariant.product.name,
            variantName: seedVariant.name,
            unitCents,
            quantity: qty,
            totalCents: unitCents * qty,
          },
        ],
      },
    },
    include: { items: true },
  });
  const variantId = seedVariant.id;

  const stockOf = async () =>
    (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock;

  const before = await stockOf();
  const movementsBefore = await db.stockMovement.count({ where: { orderId: order.id } });
  console.log(`pedido #${order.number} · ${qty} un. · estoque inicial: ${before}`);

  const { setOrderStatus } = await import("@/lib/stock");

  await setOrderStatus(order.id, "PAID", user.id);
  const afterPaid = await stockOf();
  console.log(`PAGO      → estoque ${afterPaid} (esperado ${before - qty}) ${afterPaid === before - qty ? "✔" : "✖"}`);

  // Idempotência: repetir o mesmo status não pode debitar de novo.
  await setOrderStatus(order.id, "PAID", user.id);
  const afterPaidAgain = await stockOf();
  console.log(`PAGO 2x   → estoque ${afterPaidAgain} (não pode mudar) ${afterPaidAgain === afterPaid ? "✔" : "✖"}`);

  await setOrderStatus(order.id, "SHIPPED", user.id);
  const afterShipped = await stockOf();
  console.log(`ENVIADO   → estoque ${afterShipped} (não pode mudar) ${afterShipped === afterPaid ? "✔" : "✖"}`);

  await setOrderStatus(order.id, "CANCELED", user.id);
  const afterCancel = await stockOf();
  console.log(`CANCELADO → estoque ${afterCancel} (esperado ${before}) ${afterCancel === before ? "✔" : "✖"}`);

  await setOrderStatus(order.id, "CANCELED", user.id);
  const afterCancelAgain = await stockOf();
  console.log(`CANCEL 2x → estoque ${afterCancelAgain} (não pode mudar) ${afterCancelAgain === before ? "✔" : "✖"}`);

  // O pedido do teste sai do banco no fim; volta a PENDING antes para que o
  // estorno de estoque já tenha acontecido.
  await setOrderStatus(order.id, "PENDING", user.id);

  // Delta em vez de total: o mesmo pedido acumula movimentos entre execuções.
  const movements =
    (await db.stockMovement.count({ where: { orderId: order.id } })) - movementsBefore;
  console.log(
    `movimentos gerados nesta execução: ${movements} (esperado 2 — baixa + estorno) ${movements === 2 ? "✔" : "✖"}`,
  );

  // Estoque insuficiente precisa falhar em vez de gerar saldo negativo.
  const variant = await db.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  const big = await db.order.create({
    data: {
      customerName: "Teste Estoque", customerPhone: "11900000000",
      subtotalCents: 100, totalCents: 100,
      items: { create: [{ productName: "x", variantName: "y", unitCents: 100, quantity: variant.stock + 50, totalCents: 100, variantId }] },
    },
  });
  try {
    await setOrderStatus(big.id, "PAID", user.id);
    console.log("estoque insuficiente → ✖ deveria ter falhado");
  } catch (e) {
    console.log(`estoque insuficiente → bloqueado ✔ ("${(e as Error).message.slice(0, 60)}…")`);
  }
  const stillSame = await stockOf();
  console.log(`saldo após falha: ${stillSame} (esperado ${before}) ${stillSame === before ? "✔" : "✖"}`);
  await db.order.delete({ where: { id: big.id } });
  await db.order.delete({ where: { id: order.id } });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
