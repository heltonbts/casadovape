"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

type Option = { name: string; slug: string; count?: number };

const ORDERS = [
  { value: "relevancia", label: "Relevância" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "novidades", label: "Novidades" },
  { value: "nome", label: "Nome (A-Z)" },
];

export function ProductFilters({
  categories,
  brands,
  total,
}: {
  categories: Option[];
  brands: Option[];
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();

  /** Atualiza um filtro na URL. A URL é a única fonte de verdade aqui — o
   *  usuário pode compartilhar o link com os filtros aplicados. */
  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/produtos?${next.toString()}`);
  }

  const hasFilters = ["q", "categoria", "marca", "disponivel"].some((k) => params.get(k));

  return (
    <div className="surface sticky top-32 space-y-6 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <SlidersHorizontal size={15} /> Filtros
        </h2>
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push("/produtos")}
            className="text-xs text-brand-200 hover:text-white"
          >
            Limpar
          </button>
        )}
      </div>

      <div>
        <span className="label">Ordenar por</span>
        <select
          className="field"
          value={params.get("ordem") ?? "relevancia"}
          onChange={(e) => setParam("ordem", e.target.value === "relevancia" ? null : e.target.value)}
        >
          {ORDERS.map((o) => (
            <option key={o.value} value={o.value} className="bg-ink-850">
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <FilterGroup
        title="Categoria"
        options={categories}
        active={params.get("categoria")}
        onSelect={(slug) => setParam("categoria", slug)}
      />

      <FilterGroup
        title="Marca"
        options={brands}
        active={params.get("marca")}
        onSelect={(slug) => setParam("marca", slug)}
      />

      <label className="flex cursor-pointer items-center gap-2.5 border-t border-white/8 pt-4 text-sm text-white/70">
        <input
          type="checkbox"
          checked={params.get("disponivel") === "1"}
          onChange={(e) => setParam("disponivel", e.target.checked ? "1" : null)}
          className="size-4 rounded border-white/20 bg-ink-850 accent-brand-500"
        />
        Somente em estoque
      </label>

      <p className="text-xs text-white/35">
        {total} {total === 1 ? "produto encontrado" : "produtos encontrados"}
      </p>
    </div>
  );
}

function FilterGroup({
  title,
  options,
  active,
  onSelect,
}: {
  title: string;
  options: Option[];
  active: string | null;
  onSelect: (slug: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <span className="label">{title}</span>
      <div className="space-y-0.5">
        <FilterOption label="Todas" selected={!active} onClick={() => onSelect(null)} />
        {options.map((o) => (
          <FilterOption
            key={o.slug}
            label={o.name}
            count={o.count}
            selected={active === o.slug}
            onClick={() => onSelect(active === o.slug ? null : o.slug)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterOption({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
        selected ? "bg-brand-500/15 font-medium text-brand-200" : "text-white/60 hover:bg-white/5"
      }`}
    >
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="ml-2 shrink-0 text-xs text-white/30">{count}</span>}
    </button>
  );
}
