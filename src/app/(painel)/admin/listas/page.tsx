import Link from "next/link";
import { ExternalLink, LayoutList } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import {
  CollectionRowActions,
  CollectionStatus,
  NewCollectionForm,
} from "@/components/admin/collection-manager";
import { HOME_LIST_LIMIT } from "@/lib/collections";
import { db } from "@/lib/db";

export const metadata = { title: "Listas" };

export default async function ListasAdminPage() {
  const collections = await db.collection.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      subtitle: true,
      active: true,
      showOnHome: true,
      _count: { select: { items: true } },
    },
  });

  const onHome = collections.filter((c) => c.active && c.showOnHome && c._count.items > 0);

  return (
    <>
      <PageHeader
        title="Listas da loja"
        description="Vitrines montadas à mão. A ordem daqui é a ordem em que elas aparecem na home."
        action={
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-sm text-white/60 transition hover:border-white/25 hover:text-white"
          >
            <ExternalLink size={15} /> Ver a home
          </Link>
        }
      />

      <div className="mb-6">
        <NewCollectionForm />
      </div>

      {collections.length === 0 ? (
        <EmptyState
          title="Nenhuma lista ainda"
          description="Crie a primeira acima — pode ser 'Mais vendidos', 'Chegou agora' ou o que fizer sentido para a loja."
        />
      ) : (
        <>
          <ul className="surface divide-y divide-white/5">
            {collections.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-bold text-white/50 tabular-nums">
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/listas/${c.id}`}
                    className="flex items-center gap-2 font-semibold text-white hover:text-brand-200"
                  >
                    <LayoutList size={15} className="shrink-0 text-white/30" />
                    <span className="truncate">{c.name}</span>
                  </Link>
                  <p className="truncate text-xs text-white/40">
                    {c._count.items} {c._count.items === 1 ? "produto" : "produtos"} · /lista/
                    {c.slug}
                    {c.subtitle && ` · ${c.subtitle}`}
                  </p>
                </div>

                <CollectionStatus active={c.active} showOnHome={c.showOnHome} />

                <CollectionRowActions
                  id={c.id}
                  name={c.name}
                  isFirst={i === 0}
                  isLast={i === collections.length - 1}
                />
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-white/35">
            {onHome.length === 0
              ? "Nenhuma lista está na home no momento — ela abre direto no catálogo."
              : `A home mostra ${onHome.length} ${onHome.length === 1 ? "lista" : "listas"}, com até ${HOME_LIST_LIMIT} produtos cada; o resto fica na página da lista.`}
          </p>
        </>
      )}
    </>
  );
}
