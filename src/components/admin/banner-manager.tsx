"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/catalog-managers";
import { ImageUploader } from "@/components/admin/image-uploader";
import { deleteBannerAction, saveBannerAction } from "@/app/actions/admin/marketing";

export type BannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  ctaLabel: string | null;
  position: number;
  active: boolean;
};

const EMPTY = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkUrl: "",
  ctaLabel: "",
  position: "0",
  active: true,
};

export function BannerManager({ banners }: { banners: BannerRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  const set = (key: keyof typeof EMPTY) => (value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  function startEdit(banner: BannerRow) {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      imageUrl: banner.imageUrl ?? "",
      linkUrl: banner.linkUrl ?? "",
      ctaLabel: banner.ctaLabel ?? "",
      position: String(banner.position),
      active: banner.active,
    });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveBannerAction({
        id: editingId ?? undefined,
        ...form,
        position: Number.parseInt(form.position || "0", 10) || 0,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "Banner atualizado" : "Banner criado");
      reset();
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_330px] lg:items-start">
      <ul className="surface divide-y divide-white/5">
        {banners.length === 0 && (
          <li className="p-5 text-sm text-white/40">
            Nenhum banner. A home usa um texto padrão enquanto não houver nenhum.
          </li>
        )}
        {banners.map((banner, index) => (
          <li key={banner.id} className="flex items-start gap-3 p-4">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-white">{banner.title}</span>
                {index === 0 && banner.active && <Badge tone="brand">Hero da home</Badge>}
                {!banner.active && <Badge tone="neutral">Inativo</Badge>}
              </span>
              {banner.subtitle && (
                <span className="mt-0.5 block text-xs text-white/45">{banner.subtitle}</span>
              )}
              <span className="mt-1 block text-xs text-white/30">
                posição {banner.position}
                {banner.linkUrl ? ` · ${banner.linkUrl}` : ""}
              </span>
            </span>
            <button
              type="button"
              onClick={() => startEdit(banner)}
              aria-label={`Editar ${banner.title}`}
              className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
            >
              <Pencil size={15} />
            </button>
            <DeleteButton label={banner.title} onDelete={() => deleteBannerAction(banner.id)} />
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="surface sticky top-6 space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">{editingId ? "Editar banner" : "Novo banner"}</h3>
          {editingId && (
            <button type="button" onClick={reset} aria-label="Cancelar edição" className="text-white/40 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>

        <div>
          <label className="label">Título *</label>
          <input
            className="field"
            required
            value={form.title}
            onChange={(e) => set("title")(e.target.value)}
            placeholder="Pods com até 20.000 puffs"
          />
        </div>
        <div>
          <label className="label">Subtítulo</label>
          <input
            className="field"
            value={form.subtitle}
            onChange={(e) => set("subtitle")(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Texto do botão</label>
          <input
            className="field"
            value={form.ctaLabel}
            onChange={(e) => set("ctaLabel")(e.target.value)}
            placeholder="Ver coleção"
          />
        </div>
        <div>
          <label className="label">Link do botão</label>
          <input
            className="field"
            value={form.linkUrl}
            onChange={(e) => set("linkUrl")(e.target.value)}
            placeholder="/produtos?categoria=pods-descartaveis"
          />
        </div>
        <div>
          <label className="label">Imagem de fundo</label>
          <ImageUploader
            folder="banners"
            className="mb-2"
            hint="Ideal 1600×600 — convertemos para WebP antes de enviar."
            onUploaded={([url]) => set("imageUrl")(url)}
          />
          {form.imageUrl && (
            <div className="mb-2 flex items-center gap-2">
              <span className="relative h-14 flex-1 overflow-hidden rounded-xl bg-ink-800">
                <Image src={form.imageUrl} alt="" fill unoptimized sizes="300px" className="object-cover" />
              </span>
              <button
                type="button"
                aria-label="Remover imagem"
                onClick={() => set("imageUrl")("")}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-white/35 hover:bg-red-500/10 hover:text-red-300"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
          <input
            className="field"
            value={form.imageUrl}
            onChange={(e) => set("imageUrl")(e.target.value)}
            placeholder="ou cole uma URL https://…"
          />
        </div>
        <div>
          <label className="label">Posição</label>
          <input
            className="field"
            inputMode="numeric"
            value={form.position}
            onChange={(e) => set("position")(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2.5 text-sm text-white/70">
          <input
            type="checkbox"
            className="size-4 accent-brand-500"
            checked={form.active}
            onChange={(e) => set("active")(e.target.checked)}
          />
          Banner ativo
        </label>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {editingId ? "Salvar" : "Criar banner"}
        </Button>
      </form>
    </div>
  );
}
