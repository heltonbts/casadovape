import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

type SeedProduct = {
  name: string;
  category: string;
  brand: string;
  priceCents: number;
  compareAtCents?: number;
  costCents?: number;
  featured?: boolean;
  summary: string;
  description: string;
  puffs?: number;
  nicotineMg?: string;
  liquidMl?: string;
  batteryMah?: number;
  rechargeable?: boolean;
  variants: { name: string; stock: number }[];
};

const CATEGORIES = [
  { name: "Pods Descartáveis", description: "Prontos para usar, sem recarga de líquido.", position: 1 },
  { name: "Vapes Recarregáveis", description: "Aparelhos com bateria recarregável e pod reposição.", position: 2 },
  { name: "Juices / E-liquids", description: "Líquidos nicotinados e freebase para recarregáveis.", position: 3 },
  { name: "Pods de Reposição", description: "Cartuchos e coils para os aparelhos recarregáveis.", position: 4 },
  { name: "Acessórios", description: "Carregadores, cases, cordinhas e afins.", position: 5 },
];

const BRANDS = ["Ignite", "Elf Bar", "Oxbar", "Lost Mary", "Nikbar", "Vapesoul", "GeekVape"];

const PRODUCTS: SeedProduct[] = [
  {
    name: "Ignite V150 - 15.000 Puffs",
    category: "Pods Descartáveis",
    brand: "Ignite",
    priceCents: 12990,
    compareAtCents: 15990,
    costCents: 7500,
    featured: true,
    summary: "Display de bateria e líquido, 15 mil puffs e malha mesh coil.",
    description:
      "O Ignite V150 entrega até 15.000 puffs com carregamento USB-C e display que mostra bateria e nível de líquido. Mesh coil para sabor limpo do primeiro ao último puff.",
    puffs: 15000,
    nicotineMg: "5% (50mg)",
    liquidMl: "12ml",
    batteryMah: 650,
    rechargeable: true,
    variants: [
      { name: "Blue Razz Ice", stock: 24 },
      { name: "Watermelon Bubblegum", stock: 18 },
      { name: "Miami Mint", stock: 6 },
      { name: "Peach Mango", stock: 0 },
    ],
  },
  {
    name: "Elf Bar BC10000",
    category: "Pods Descartáveis",
    brand: "Elf Bar",
    priceCents: 9990,
    compareAtCents: 11990,
    costCents: 5800,
    featured: true,
    summary: "Clássico da Elf Bar com 10.000 puffs e recarga USB-C.",
    description:
      "Um dos descartáveis mais vendidos do Brasil. Bateria de 650mAh recarregável, 18ml de líquido e sabores marcantes.",
    puffs: 10000,
    nicotineMg: "5% (50mg)",
    liquidMl: "18ml",
    batteryMah: 650,
    rechargeable: true,
    variants: [
      { name: "Strawberry Mango", stock: 30 },
      { name: "Cherry Cola", stock: 12 },
      { name: "Blue Razz Lemonade", stock: 9 },
      { name: "Kiwi Passion Guava", stock: 3 },
    ],
  },
  {
    name: "Oxbar Magic Maze Pro 10.000",
    category: "Pods Descartáveis",
    brand: "Oxbar",
    priceCents: 11490,
    costCents: 6900,
    featured: true,
    summary: "Design com tela colorida animada e dois modos de potência.",
    description:
      "Tela LED colorida, 10.000 puffs, modo Regular e Boost. Um dos aparelhos com melhor acabamento da linha Oxbar.",
    puffs: 10000,
    nicotineMg: "5% (50mg)",
    liquidMl: "13ml",
    batteryMah: 650,
    rechargeable: true,
    variants: [
      { name: "Sakura Grape", stock: 15 },
      { name: "Strawberry Ice", stock: 21 },
      { name: "Mint Fusion", stock: 4 },
    ],
  },
  {
    name: "Lost Mary MO20000 Pro",
    category: "Pods Descartáveis",
    brand: "Lost Mary",
    priceCents: 14990,
    compareAtCents: 17990,
    costCents: 8900,
    featured: true,
    summary: "20.000 puffs, dual mesh e display duplo.",
    description:
      "Top de linha da Lost Mary: 20.000 puffs, dual mesh coil, display duplo de bateria e líquido e airflow ajustável.",
    puffs: 20000,
    nicotineMg: "5% (50mg)",
    liquidMl: "20ml",
    batteryMah: 900,
    rechargeable: true,
    variants: [
      { name: "Watermelon Cherry", stock: 11 },
      { name: "Triple Berry Ice", stock: 8 },
      { name: "Blueberry Raspberry", stock: 2 },
    ],
  },
  {
    name: "Nikbar 6000 Puffs",
    category: "Pods Descartáveis",
    brand: "Nikbar",
    priceCents: 6990,
    costCents: 3900,
    summary: "Entrada de linha com ótimo custo-benefício.",
    description: "Compacto, leve e barato. Ideal para quem está começando ou quer um aparelho reserva.",
    puffs: 6000,
    nicotineMg: "5% (50mg)",
    liquidMl: "10ml",
    batteryMah: 500,
    rechargeable: true,
    variants: [
      { name: "Menta", stock: 40 },
      { name: "Uva Gelada", stock: 25 },
      { name: "Morango", stock: 33 },
    ],
  },
  {
    name: "GeekVape Wenax Q Pro Kit",
    category: "Vapes Recarregáveis",
    brand: "GeekVape",
    priceCents: 19990,
    compareAtCents: 23990,
    costCents: 12500,
    featured: true,
    summary: "Kit recarregável 1000mAh com pod substituível de 2ml.",
    description:
      "Aparelho recarregável para quem quer economizar a longo prazo: você repõe só o pod e o líquido. Potência ajustável e bateria de 1000mAh.",
    batteryMah: 1000,
    liquidMl: "2ml",
    rechargeable: true,
    variants: [
      { name: "Preto", stock: 10 },
      { name: "Prata", stock: 7 },
      { name: "Azul", stock: 5 },
    ],
  },
  {
    name: "Vapesoul Pod Kit 800mAh",
    category: "Vapes Recarregáveis",
    brand: "Vapesoul",
    priceCents: 15990,
    costCents: 9500,
    summary: "Kit compacto tipo caneta, acionamento automático.",
    description: "Formato caneta, acionamento por tragada e pod recarregável de 2ml. Simples de usar no dia a dia.",
    batteryMah: 800,
    liquidMl: "2ml",
    rechargeable: true,
    variants: [
      { name: "Preto", stock: 14 },
      { name: "Vermelho", stock: 6 },
    ],
  },
  {
    name: "Juice Nasty Salt 30ml",
    category: "Juices / E-liquids",
    brand: "Vapesoul",
    priceCents: 5990,
    costCents: 3200,
    summary: "Nic salt 35mg, 30ml, para pods recarregáveis.",
    description: "Nicotina em sal, hit suave e sabor intenso. Compatível com qualquer pod recarregável.",
    nicotineMg: "35mg",
    liquidMl: "30ml",
    variants: [
      { name: "Slow Blow", stock: 20 },
      { name: "Cush Man Mango", stock: 16 },
      { name: "Bad Blood", stock: 9 },
      { name: "Wicked Haze", stock: 1 },
    ],
  },
  {
    name: "Juice Ignite Salt 30ml",
    category: "Juices / E-liquids",
    brand: "Ignite",
    priceCents: 6490,
    costCents: 3600,
    summary: "Linha de líquidos da Ignite em nic salt 50mg.",
    description: "Mesma pegada de sabor dos descartáveis Ignite, agora para o seu pod recarregável.",
    nicotineMg: "50mg",
    liquidMl: "30ml",
    variants: [
      { name: "Blue Razz", stock: 12 },
      { name: "Peach Ice", stock: 10 },
    ],
  },
  {
    name: "Pod de Reposição Wenax Q (2 un)",
    category: "Pods de Reposição",
    brand: "GeekVape",
    priceCents: 4490,
    costCents: 2400,
    summary: "Cartucho 2ml com coil 0.8ohm, cartela com 2 unidades.",
    description: "Reposição oficial para o Wenax Q Pro. Recomenda-se trocar a cada 2 a 3 semanas de uso.",
    liquidMl: "2ml",
    variants: [
      { name: "0.8ohm", stock: 28 },
      { name: "1.2ohm", stock: 17 },
    ],
  },
  {
    name: "Carregador USB-C 1m",
    category: "Acessórios",
    brand: "Vapesoul",
    priceCents: 2490,
    costCents: 900,
    summary: "Cabo USB-C reforçado para recarregar seu pod.",
    description: "Cabo de 1 metro com malha trançada, compatível com todos os pods recarregáveis USB-C.",
    variants: [{ name: "Padrão", stock: 50 }],
  },
  {
    name: "Cordinha / Lanyard para Pod",
    category: "Acessórios",
    brand: "Vapesoul",
    priceCents: 1990,
    costCents: 700,
    summary: "Cordinha ajustável com suporte de silicone.",
    description: "Prenda o pod no pescoço e pare de perder o aparelho. Suporte em silicone que serve na maioria dos modelos.",
    variants: [
      { name: "Preta", stock: 22 },
      { name: "Camuflada", stock: 13 },
    ],
  },
];

async function main() {
  console.log("→ limpando dados anteriores…");
  await db.stockMovement.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.customer.deleteMany();
  await db.productVariant.deleteMany();
  await db.productImage.deleteMany();
  await db.product.deleteMany();
  await db.category.deleteMany();
  await db.brand.deleteMany();
  await db.coupon.deleteMany();
  await db.banner.deleteMany();

  console.log("→ admin…");
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@casadovape.com.br";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "casadovape123";
  await db.adminUser.upsert({
    where: { email },
    update: { passwordHash: await bcrypt.hash(password, 10), role: "OWNER", active: true },
    create: {
      name: "Administrador",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "OWNER",
    },
  });

  console.log("→ configurações da loja…");
  await db.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      storeName: "Casa do Vape",
      tagline: "Os melhores pods e vapes, entrega rápida.",
      whatsapp: "5588999275994",
      instagram: "casadovape",
      email: "contato@casadovape.com.br",
      pixKey: "contato@casadovape.com.br",
      pixHolder: "Casa do Vape LTDA",
      announcement: "Frete grátis na cidade · Pedido fechado no WhatsApp",
      ageGateEnabled: true,
      legalNotice:
        "Venda proibida para menores de 18 anos. Produtos contêm nicotina, substância que causa dependência.",
    },
  });

  console.log("→ categorias e marcas…");
  const categories = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await db.category.create({
      data: { name: c.name, slug: slugify(c.name), description: c.description, position: c.position },
    });
    categories.set(c.name, row.id);
  }

  const brands = new Map<string, string>();
  for (const name of BRANDS) {
    const row = await db.brand.create({ data: { name, slug: slugify(name) } });
    brands.set(name, row.id);
  }

  console.log("→ produtos, variantes e estoque inicial…");
  for (const p of PRODUCTS) {
    const product = await db.product.create({
      data: {
        name: p.name,
        slug: slugify(p.name),
        summary: p.summary,
        description: p.description,
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents,
        costCents: p.costCents,
        featured: p.featured ?? false,
        puffs: p.puffs,
        nicotineMg: p.nicotineMg,
        liquidMl: p.liquidMl,
        batteryMah: p.batteryMah,
        rechargeable: p.rechargeable,
        categoryId: categories.get(p.category),
        brandId: brands.get(p.brand),
        variants: {
          create: p.variants.map((v, i) => ({
            name: v.name,
            stock: v.stock,
            position: i,
            sku: `${slugify(p.name).slice(0, 12).toUpperCase()}-${slugify(v.name).slice(0, 8).toUpperCase()}`,
          })),
        },
      },
      include: { variants: true },
    });

    // Registra o estoque inicial como movimento de entrada, para o histórico
    // do admin nascer coerente com o saldo.
    for (const v of product.variants) {
      if (v.stock > 0) {
        await db.stockMovement.create({
          data: { variantId: v.id, type: "IN", quantity: v.stock, balance: v.stock, reason: "Estoque inicial" },
        });
      }
    }
  }

  console.log("→ banners e cupons…");
  await db.banner.createMany({
    data: [
      {
        title: "Pods descartáveis com até 20.000 puffs",
        subtitle: "Frete grátis na cidade. Pague no Pix e ganhe desconto.",
        ctaLabel: "Ver coleção",
        linkUrl: "/produtos?categoria=pods-descartaveis",
        position: 1,
      },
      {
        title: "Kits recarregáveis",
        subtitle: "Economize a longo prazo: troque só o pod e o líquido.",
        ctaLabel: "Conhecer kits",
        linkUrl: "/produtos?categoria=vapes-recarregaveis",
        position: 2,
      },
    ],
  });

  await db.coupon.createMany({
    data: [
      { code: "PIX10", type: "PERCENT", value: 10, minSubtotalCents: 10000, active: true },
      { code: "PRIMEIRACOMPRA", type: "FIXED", value: 1500, minSubtotalCents: 15000, maxUses: 100, active: true },
    ],
  });

  const counts = {
    categorias: await db.category.count(),
    marcas: await db.brand.count(),
    produtos: await db.product.count(),
    variantes: await db.productVariant.count(),
  };
  console.log("✔ seed concluído:", counts);
  console.log(`  admin: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
