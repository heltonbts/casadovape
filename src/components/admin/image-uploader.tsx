"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { convertToWebp } from "@/lib/image-webp";
import { cn } from "@/lib/utils";

type Props = {
  /** Pasta no Vercel Blob. Precisa existir na allowlist da rota de upload. */
  folder: "produtos" | "banners" | "categorias";
  multiple?: boolean;
  hint?: string;
  className?: string;
  /** Recebe as URLs públicas das imagens que subiram com sucesso. */
  onUploaded: (urls: string[]) => void;
};

async function upload(file: File, folder: string) {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);

  const response = await fetch("/api/admin/upload", { method: "POST", body });
  const data = (await response.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null;

  if (!response.ok || !data?.url) {
    throw new Error(data?.error ?? "Falha no upload da imagem.");
  }
  return data.url;
}

export function ImageUploader({ folder, multiple, hint, className, onUploaded }: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const busy = progress !== null;

  async function handleFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    const selected = multiple ? files : files.slice(0, 1);
    setProgress({ done: 0, total: selected.length });

    const urls: string[] = [];
    let fellBackToJpeg = false;

    for (const file of selected) {
      try {
        const { file: converted, isWebp } = await convertToWebp(file);
        if (!isWebp) fellBackToJpeg = true;
        urls.push(await upload(converted, folder));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha no upload.");
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";

    if (urls.length > 0) {
      onUploaded(urls);
      toast.success(urls.length === 1 ? "Imagem enviada" : `${urls.length} imagens enviadas`);
      if (fellBackToJpeg) {
        toast.warning("Seu navegador não gera WebP — as imagens subiram em JPEG.");
      }
    }
  }

  return (
    <div className={className}>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed",
          "border-white/15 bg-ink-850/60 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-white/5",
          dragging && "border-brand-400 bg-brand-500/10",
          busy && "pointer-events-none opacity-60",
        )}
      >
        {busy ? (
          <>
            <Loader2 size={18} className="animate-spin text-brand-300" />
            <span className="text-sm text-white/70">
              Enviando {Math.min(progress.done + 1, progress.total)} de {progress.total}…
            </span>
          </>
        ) : (
          <>
            <ImagePlus size={18} className="text-white/45" />
            <span className="text-sm font-medium text-white">
              Arraste {multiple ? "as fotos" : "a foto"} ou clique para escolher
            </span>
            <span className="text-xs text-white/40">
              {hint ?? "Convertemos para WebP antes de enviar."}
            </span>
          </>
        )}
      </label>
    </div>
  );
}
