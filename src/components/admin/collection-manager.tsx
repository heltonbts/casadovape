"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Home,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  addProductToCollectionAction,
  deleteCollectionAction,
  moveCollectionAction,
  moveCollectionItemAction,
  removeProductFromCollectionAction,
  saveCollectionAction,
} from "@/app/actions/admin/collections";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------ nova lista */

export function NewCollectionForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  return (
    <form
      className="surface flex flex-wrap items-end gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        startTransition(async () => {
          const result = await saveCollectionAction({
            name,
            active: true,
            showOnHome: true,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          setName("");
          toast.success("Lista criada");
          router.push(`/admin/listas/${result.id}`);
        });
      }}
    >
      <label className="min-w-48 flex-1">
        <span className="label">Nome da lista</span>
        <input
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mais vendidos, Chegou agora…"
        />
      </label>
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Criar lista
      </button>
    </form>
  );
}

/* --------------------------------------------------- ordem e ações da lista */

export function CollectionRowActions({
  id,
  name,
  isFirst,
  isLast,
}: {
  id: string;
  name: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const move = (direction: "up" | "down") =>
    startTransition(async () => {
      await moveCollectionAction(id, direction);
      router.refresh();
    });

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
        <span className="text-xs text-white/50">Excluir a lista?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteCollectionAction(id);
              if (!result.ok) {
                toast.error(result.error);
                setConfirming(false);
                return;
              }
              toast.success(`${name} excluída`);
              router.refresh();
            })
          }
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-300"
        >
          {pending ? <Loader2 size={12} className="animate-spin" /> : "Sim"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="px-2 py-1 text-xs text-white/50"
        >
          Não
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <MoveButtons pending={pending} isFirst={isFirst} isLast={isLast} onMove={move} />
      <Link
        href={`/admin/listas/${id}`}
        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-200 hover:bg-white/5"
      >
        Editar
      </Link>
      <button
        type="button"
        title="Excluir lista"
        onClick={() => setConfirming(true)}
        className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function MoveButtons({
  pending,
  isFirst,
  isLast,
  onMove,
}: {
  pending: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="flex items-center">
      <button
        type="button"
        title="Subir"
        disabled={pending || isFirst}
        onClick={() => onMove("up")}
        className="grid size-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
      >
        <ChevronUp size={16} />
      </button>
      <button
        type="button"
        title="Descer"
        disabled={pending || isLast}
        onClick={() => onMove("down")}
        className="grid size-8 place-items-center rounded-lg text-white/40 transition hover:bg-white/5 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );
}

/* ---------------------------------------------------- ajustes de uma lista */

export function CollectionSettingsForm({
  collection,
}: {
  collection: {
    id: string;
    name: string;
    subtitle: string | null;
    slug: string;
    active: boolean;
    showOnHome: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(collection.name);
  const [subtitle, setSubtitle] = useState(collection.subtitle ?? "");
  const [active, setActive] = useState(collection.active);
  const [showOnHome, setShowOnHome] = useState(collection.showOnHome);

  return (
    <form
      className="surface space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await saveCollectionAction({
            id: collection.id,
            name,
            subtitle,
            slug: collection.slug,
            active,
            showOnHome,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Lista salva");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Nome</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          <span className="label">Subtítulo</span>
          <input
            className="field"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Uma linha curta abaixo do título"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Toggle
          on={active}
          onChange={setActive}
          onIcon={<Eye size={15} />}
          offIcon={<EyeOff size={15} />}
          label={active ? "Publicada na loja" : "Oculta da loja"}
        />
        <Toggle
          on={showOnHome}
          onChange={setShowOnHome}
          onIcon={<Home size={15} />}
          offIcon={<Home size={15} />}
          label={showOnHome ? "Aparece na home" : "Fora da home"}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
        <p className="text-xs text-white/35">
          Endereço na loja: <span className="text-white/55">/lista/{collection.slug}</span>
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-50"
        >
          {pending && <Loader2 size={15} className="animate-spin" />} Salvar
        </button>
      </div>
    </form>
  );
}

function Toggle({
  on,
  onChange,
  onIcon,
  offIcon,
  label,
}: {
  on: boolean;
  onChange: (value: boolean) => void;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition",
        on
          ? "border-brand-400/40 bg-brand-500/10 text-brand-200"
          : "border-white/10 text-white/45 hover:border-white/25",
      )}
    >
      {on ? onIcon : offIcon}
      {label}
    </button>
  );
}

/* ------------------------------------------------- produtos dentro da lista */

export function CollectionItemActions({
  collectionId,
  productId,
  name,
  isFirst,
  isLast,
}: {
  collectionId: string;
  productId: string;
  name: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex shrink-0 items-center gap-1">
      <MoveButtons
        pending={pending}
        isFirst={isFirst}
        isLast={isLast}
        onMove={(direction) =>
          startTransition(async () => {
            await moveCollectionItemAction(collectionId, productId, direction);
            router.refresh();
          })
        }
      />
      <button
        type="button"
        title="Tirar da lista"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await removeProductFromCollectionAction(collectionId, productId);
            toast.success(`${name} saiu da lista`);
            router.refresh();
          })
        }
        className="grid size-8 place-items-center rounded-lg text-white/40 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <X size={16} />}
      </button>
    </div>
  );
}

export function AddToCollectionButton({
  collectionId,
  productId,
  name,
}: {
  collectionId: string;
  productId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await addProductToCollectionAction(collectionId, productId);
          toast.success(`${name} entrou na lista`);
          router.refresh();
        })
      }
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-400/40 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-200 transition hover:bg-brand-500/20 disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
    </button>
  );
}

/** Etiqueta de estado da lista, usada na listagem do painel. */
export function CollectionStatus({ active, showOnHome }: { active: boolean; showOnHome: boolean }) {
  if (!active) return <Badge tone="neutral">Oculta</Badge>;
  if (!showOnHome) return <Badge tone="accent">Só na página</Badge>;
  return <Badge tone="brand">Na home</Badge>;
}
