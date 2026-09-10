import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/ui";
import {
  AddToCollectionButton,
  CollectionItemActions,
  CollectionSettingsForm,
} from "@/components/admin/collection-manager";
import { ProductThumb } from "@/components/store/product-thumb";
import { HOME_LIST_LIMIT } from "@/lib/collections";
import { db } from "@/lib/db";
import { brl, cn } from "@/lib/utils";

const PRODUCT_SELECT = {
  id: true,
  name: true,
  priceCents: true,
  active: true,
  brand: { select: { name: true } },
  images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
  variants: { where: { active: true }, select: { stock: true } },
} as const;

export async function generateMetadata(props: PageProps<"/admin/listas/[id]">) {
  const { id } = await props.params;
  const collection = await db.collection.findUnique({ where: { id }, select: { name: true } });
  return { title: collection?.name ?? "Lista" };
}

export default async function ListaAdminPage(props: PageProps<"/admin/listas/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim();

  const collection = await db.collection.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      subtitle: true,
      active: true,
      showOnHome: true,
      items: {
        orderBy: { position: "asc" },
        select: { productId: true, product: { select: PRODUCT_SELECT } },
      },
    },
  });

  if (!collection) notFound();

  const inList = new Set(collection.items.map((i) => i.productId));

  const candidates = await db.product.findMany({
    where: {
      id: { notIn: inList.size > 0 ? [...inList] : undefined },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { brand: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    take: q ? 40 : 10,
    select: PRODUCT_SELECT,
  });

  return (
    <>
      <Link
        href="/admin/listas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white"
      >
        <ArrowLeft size={15} /> Todas as listas
      </Link>

      <PageHeader
        title={collection.name}
        description="A ordem dos produtos aqui é a ordem em que a loja mostra a lista."
        action={
          <Link
            href={`/lista/${collection.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-white/60 transition hover:border-white/25 hover:text-white"
          >
            <ExternalLink size={15} /> Ver na loja
          </Link>
        }
      />

      <CollectionSettingsForm collection={collection} />

      {/* ------------------------------------------------ produtos da lista */}
      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-white">Produtos da lista</h2>
          <p className="text-xs text-white/40">
            {collection.items.length} {collection.items.length === 1 ? "produto" : "produtos"}
          </p>
        </div>

        {collection.items.length === 0 ? (
          <div className="surface p-6 text-sm text-white/45">
            Lista vazia. Escolha os produtos abaixo — enquanto estiver assim, ela não aparece na
            loja.
          </div>
        ) : (
          <ul className="surface divide-y divide-white/5">
            {collection.items.map((item, i) => (
              <ProductRow
                key={item.productId}
                product={item.product}
                position={i}
                dimmed={i >= HOME_LIST_LIMIT}
                action={
                  <CollectionItemActions
                    collectionId={collection.id}
                    productId={item.productId}
                    name={item.product.name}
                    isFirst={i === 0}
                    isLast={i === collection.items.length - 1}
                  />
                }
              />
            ))}
          </ul>
        )}

        {collection.items.length > HOME_LIST_LIMIT && collection.showOnHome && (
          <p className="mt-2 text-xs text-white/35">
            Na home cabem os {HOME_LIST_LIMIT} primeiros; do {HOME_LIST_LIMIT + 1}º em diante só
            na página da lista.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------- adicionar */}
      <section className="mt-8">
        <h2 className="mb-3 font-bold text-white">Adicionar produtos</h2>

        <form className="mb-4" action={`/admin/listas/${collection.id}`}>
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              name="q"
              defaultValue={q}
              className="field pl-9"
              placeholder="Buscar por nome ou marca…"
              aria-label="Buscar produtos para adicionar"
            />
          </div>
        </form>

        {candidates.length === 0 ? (
          <div className="surface p-5 text-sm text-white/45">
            {q ? "Nenhum produto fora da lista com esse termo." : "Todo o catálogo já está na lista."}
          </div>
        ) : (
          <>
            <ul className="surface divide-y divide-white/5">
              {candidates.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  action={
                    <AddToCollectionButton
                      collectionId={collection.id}
                      productId={product.id}
                      name={product.name}
                    />
                  }
                />
              ))}
            </ul>
            {!q && (
              <p className="mt-2 text-xs text-white/35">
                Mostrando os 10 produtos mais recentes — use a busca para achar os outros.
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}

type Row = {
  id: string;
  name: string;
  priceCents: number;
  active: boolean;
  brand: { name: string } | null;
  images: { url: string; alt: string | null }[];
  variants: { stock: number }[];
};

function ProductRow({
  product,
  position,
  dimmed,
  action,
}: {
  product: Row;
  position?: number;
  dimmed?: boolean;
  action: React.ReactNode;
}) {
  const stock = product.variants.reduce((sum, v) => sum + v.stock, 0);

  return (
    <li className={cn("flex items-center gap-3 p-3", dimmed && "opacity-55")}>
      {position !== undefined && (
        <span className="w-5 shrink-0 text-center text-xs font-bold text-white/25 tabular-nums">
          {position + 1}
        </span>
      )}

      <ProductThumb
        src={product.images[0]?.url}
        alt={product.images[0]?.alt}
        name={product.name}
        sizes="56px"
        className="size-14 shrink-0 rounded-lg"
      />

      <div className="min-w-0 flex-1">
        <Link
          href={`/admin/produtos/${product.id}`}
          className="block truncate text-sm font-medium text-white hover:text-brand-200"
        >
          {product.name}
        </Link>
        <p className="truncate text-xs text-white/40">
          {product.brand?.name ?? "sem marca"} · {brl(product.priceCents)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {!product.active ? (
          <Badge tone="neutral">Oculto</Badge>
        ) : (
          <span className={cn("text-xs tabular-nums", stock === 0 ? "text-red-300" : "text-white/40")}>
            {stock === 0 ? "esgotado" : `${stock} un.`}
          </span>
        )}
        {action}
      </div>
    </li>
  );
}
