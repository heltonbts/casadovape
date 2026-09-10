import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

/**
 * Teste de integração da baixa em cascata do combo.
 * Monta um combo descartável com duas variantes reais, vende, confere que o
 * estoque saiu dos ITENS (e não do combo), estorna e apaga o que criou.
 * Uso: npm run test:combo
 */

async function main() {
  const user = await db.adminUser.findFirstOrThrow();

  // Duas variantes de produtos diferentes, com saldo para o teste mexer.
  const sources = await db.productVariant.findMany({
    where: { active: true, stock: { gte: 3 }, product: { isCombo: false } },
    distinct: ["productId"],
    take: 2,
    include: { product: { select: { name: true } } },
  });
  if (sources.length < 2) throw new Error("Preciso de 2 produtos com estoque >= 3 para o teste");

  const [first, second] = sources;
  // Quantidades diferentes: se a multiplicação estiver errada, aparece aqui.
  const parts = [
    { variantId: first.id, quantity: 1 },
    { variantId: second.id, quantity: 2 },
  ];

  const combo = await db.product.create({
    data: {
      name: `__teste combo ${Date.now()}`,
      slug: `teste-combo-${Date.now()}`,
      priceCents: 19990,
      isCombo: true,
      active: false, // não aparece na loja enquanto o teste roda
      variants: { create: { name: "Padrão", stock: 0 } },
      comboItems: { create: parts.map((p, i) => ({ ...p, position: i })) },
    },
    include: { variants: true },
  });
  const comboVariantId = combo.variants[0].id;

  const stockOf = async (id: string) =>
    (await db.productVariant.findUniqueOrThrow({ where: { id } })).stock;

  const beforeFirst = await stockOf(first.id);
  const beforeSecond = await stockOf(second.id);
  const soldCombos = 2;

  console.log(`combo: 1× ${first.product.name} + 2× ${second.product.name}`);
  console.log(`estoque inicial: ${beforeFirst} e ${beforeSecond} · vendendo ${soldCombos} combos`);

  const order = await db.order.create({
    data: {
      customerName: "Teste Combo",
      customerPhone: "",
      subtotalCents: combo.priceCents * soldCombos,
      totalCents: combo.priceCents * soldCombos,
      items: {
        create: [
          {
            productId: combo.id,
            variantId: comboVariantId,
            productName: combo.name,
            variantName: "Padrão",
            unitCents: combo.priceCents,
            quantity: soldCombos,
            totalCents: combo.priceCents * soldCombos,
          },
        ],
      },
    },
  });

  const { setOrderStatus } = await import("@/lib/stock");
  const check = (label: string, got: number, want: number) =>
    console.log(`${label} → ${got} (esperado ${want}) ${got === want ? "✔" : "✖"}`);

  await setOrderStatus(order.id, "PAID", user.id);
  check("PAGO      item 1", await stockOf(first.id), beforeFirst - 1 * soldCombos);
  check("PAGO      item 2", await stockOf(second.id), beforeSecond - 2 * soldCombos);
  check("PAGO      combo ", await stockOf(comboVariantId), 0);

  // Idempotência: confirmar duas vezes não pode debitar de novo.
  await setOrderStatus(order.id, "PAID", user.id);
  check("PAGO 2x   item 2", await stockOf(second.id), beforeSecond - 2 * soldCombos);

  await setOrderStatus(order.id, "CANCELED", user.id);
  check("CANCELADO item 1", await stockOf(first.id), beforeFirst);
  check("CANCELADO item 2", await stockOf(second.id), beforeSecond);

  // O combo não pode gerar movimento na própria variante — ela não tem saldo
  // que alguém reponha.
  const noise = await db.stockMovement.count({
    where: { orderId: order.id, variantId: comboVariantId },
  });
  console.log(`movimentos na variante do combo: ${noise} (esperado 0) ${noise === 0 ? "✔" : "✖"}`);

  // Vender mais combos do que o item mais escasso permite tem que falhar.
  const scarce = Math.floor((await stockOf(second.id)) / 2);
  const tooMany = await db.order.create({
    data: {
      customerName: "Teste Combo",
      customerPhone: "",
      subtotalCents: 100,
      totalCents: 100,
      items: {
        create: [
          {
            productId: combo.id,
            variantId: comboVariantId,
            productName: combo.name,
            variantName: "Padrão",
            unitCents: 100,
            quantity: scarce + 5,
            totalCents: 100,
          },
        ],
      },
    },
  });
  try {
    await setOrderStatus(tooMany.id, "PAID", user.id);
    console.log("acima do saldo → ✖ deveria ter falhado");
  } catch (e) {
    console.log(`acima do saldo → bloqueado ✔ ("${(e as Error).message.slice(0, 55)}…")`);
  }
  check("após a falha item 2", await stockOf(second.id), beforeSecond);

  await db.order.delete({ where: { id: tooMany.id } });
  await db.order.delete({ where: { id: order.id } });
  await db.product.delete({ where: { id: combo.id } });
  console.log("limpeza: pedidos e combo de teste removidos ✔");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
