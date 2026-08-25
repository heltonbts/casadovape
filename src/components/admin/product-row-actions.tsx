"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProductAction, toggleProductActiveAction } from "@/app/actions/admin/products";

export function ProductRowActions({
  id,
  slug,
  name,
  active,
}: {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
        <span className="text-xs text-white/50">Excluir?</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteProductAction(id);
              if (!result.ok) {
                toast.error(result.error);
                setConfirming(false);
                return;
              }
              toast.success(`${name} excluído`);
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
      <Link
        href={`/produto/${slug}`}
        target="_blank"
        title="Ver na loja"
        className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
      >
        <Eye size={15} />
      </Link>
      <button
        type="button"
        title={active ? "Ocultar da loja" : "Publicar na loja"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await toggleProductActiveAction(id, !active);
            toast.success(active ? "Produto ocultado" : "Produto publicado");
            router.refresh();
          })
        }
        className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
      >
        {active ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <Link
        href={`/admin/produtos/${id}`}
        title="Editar"
        className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
      >
        <Pencil size={15} />
      </Link>
      <button
        type="button"
        title="Excluir"
        onClick={() => setConfirming(true)}
        className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
