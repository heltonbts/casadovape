"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  deleteBrandAction,
  deleteCategoryAction,
  saveBrandAction,
  saveCategoryAction,
} from "@/app/actions/admin/catalog";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  description: string | null;
  position: number;
  active: boolean;
  productCount: number;
};

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "", position: "0", active: true });

  function startEdit(category: Category) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? "",
      position: String(category.position),
      active: category.active,
    });
  }

  function reset() {
    setEditing(null);
    setForm({ name: "", description: "", position: "0", active: true });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveCategoryAction({
        id: editing?.id,
        name: form.name,
        description: form.description,
        position: Number.parseInt(form.position || "0", 10) || 0,
        active: form.active,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Categoria atualizada" : "Categoria criada");
      reset();
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
      <ul className="surface divide-y divide-white/5">
        {categories.length === 0 && (
          <li className="p-5 text-sm text-white/40">Nenhuma categoria cadastrada.</li>
        )}
        {categories.map((category) => (
          <li key={category.id} className="flex items-center gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-white">
                {category.name}
                {!category.active && <span className="ml-2 text-xs text-white/35">(oculta)</span>}
              </span>
              <span className="text-xs text-white/40">
                posição {category.position} · {category.productCount} produtos
              </span>
            </span>
            <button
              type="button"
              onClick={() => startEdit(category)}
              aria-label={`Editar ${category.name}`}
              className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
            >
              <Pencil size={15} />
            </button>
            <DeleteButton
              label={category.name}
              onDelete={() => deleteCategoryAction(category.id)}
              hint="Os produtos ficam sem categoria."
            />
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="surface sticky top-6 space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">{editing ? "Editar categoria" : "Nova categoria"}</h3>
          {editing && (
            <button type="button" onClick={reset} aria-label="Cancelar edição" className="text-white/40 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>

        <div>
          <label className="label">Nome *</label>
          <input
            className="field"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Descrição</label>
          <input
            className="field"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Posição no menu</label>
          <input
            className="field"
            inputMode="numeric"
            value={form.position}
            onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-2.5 text-sm text-white/70">
          <input
            type="checkbox"
            className="size-4 accent-brand-500"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          Visível na loja
        </label>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {editing ? "Salvar" : "Criar categoria"}
        </Button>
      </form>
    </div>
  );
}

type Brand = { id: string; name: string; active: boolean; productCount: number };

export function BrandManager({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveBrandAction({ name, active: true });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Marca criada");
      setName("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="field max-w-xs"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da marca"
          aria-label="Nome da marca"
        />
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Adicionar
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {brands.length === 0 && <p className="text-sm text-white/40">Nenhuma marca cadastrada.</p>}
        {brands.map((brand) => (
          <span
            key={brand.id}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80"
          >
            {brand.name}
            <span className="text-xs text-white/35">{brand.productCount}</span>
            <DeleteButton
              label={brand.name}
              onDelete={() => deleteBrandAction(brand.id)}
              hint="Os produtos ficam sem marca."
            />
          </span>
        ))}
      </div>
    </div>
  );
}

export function DeleteButton({
  label,
  onDelete,
  hint,
}: {
  label: string;
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
  hint?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Excluir ${label}`}
        title={hint}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-white/35 hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 size={15} />
      </button>
    );
  }

  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await onDelete();
            if (!result.ok) {
              toast.error(result.error ?? "Erro ao excluir");
              setConfirming(false);
              return;
            }
            toast.success(`${label} excluído`);
            router.refresh();
          })
        }
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : "Excluir"}
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="px-1 text-xs text-white/45">
        Não
      </button>
    </span>
  );
}
