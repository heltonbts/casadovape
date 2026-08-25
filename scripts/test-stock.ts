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
  const order = await db.order.findFirstOrThrow({ include: { items: true } });
  const variantId = order.items[0].variantId!;
  const qty = order.items[0].quantity;

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

  // Volta o pedido para PENDING para não deixar lixo de teste.
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
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
