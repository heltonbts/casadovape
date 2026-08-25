"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, ExternalLink, GripVertical, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { saveProductAction } from "@/app/actions/admin/products";
import { toCents } from "@/lib/utils";

type VariantRow = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  lowStockAlert: string;
  active: boolean;
};

export type ProductFormData = {
  id?: string;
  name: string;
  slug: string;
  summary: string;
  description: string;
  price: string;
  compareAt: string;
  cost: string;
  categoryId: string;
  brandId: string;
  featured: boolean;
  active: boolean;
  puffs: string;
  nicotineMg: string;
  liquidMl: string;
  batteryMah: string;
  rechargeable: "" | "sim" | "nao";
  images: { url: string; alt: string }[];
  variants: VariantRow[];
};

export const EMPTY_PRODUCT: ProductFormData = {
  name: "",
  slug: "",
  summary: "",
  description: "",
  price: "",
  compareAt: "",
  cost: "",
  categoryId: "",
  brandId: "",
  featured: false,
  active: true,
  puffs: "",
  nicotineMg: "",
  liquidMl: "",
  batteryMah: "",
  rechargeable: "",
  images: [],
  variants: [{ name: "Padrão", sku: "", price: "", stock: "0", lowStockAlert: "5", active: true }],
};

const numberOrNull = (v: string) => {
  const n = Number.parseInt(v.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

export function ProductForm({
  initial,
  categories,
  brands,
}: {
  initial: ProductFormData;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initial.id);

  const set = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setVariant = (index: number, patch: Partial<VariantRow>) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveProductAction({
        id: form.id,
        name: form.name,
        slug: form.slug,
        summary: form.summary,
        description: form.description,
        priceCents: toCents(form.price),
        compareAtCents: form.compareAt ? toCents(form.compareAt) : null,
        costCents: form.cost ? toCents(form.cost) : null,
        categoryId: form.categoryId || null,
        brandId: form.brandId || null,
        featured: form.featured,
        active: form.active,
        puffs: numberOrNull(form.puffs),
        nicotineMg: form.nicotineMg,
        liquidMl: form.liquidMl,
        batteryMah: numberOrNull(form.batteryMah),
        rechargeable: form.rechargeable === "" ? null : form.rechargeable === "sim",
        images: form.images.filter((i) => i.url.trim()),
        variants: form.variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          priceCents: v.price.trim() ? toCents(v.price) : null,
          stock: Number.parseInt(v.stock || "0", 10) || 0,
          lowStockAlert: Number.parseInt(v.lowStockAlert || "0", 10) || 0,
          active: v.active,
        })),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Produto atualizado" : "Produto cadastrado");
      router.push("/admin/produtos");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1.5fr_1fr] xl:items-start">
      <div className="space-y-6">
        {/* -------------------------------------------------------- básico */}
        <section className="surface p-5">
          <h2 className="mb-4 font-bold text-white">Informações básicas</h2>
          <div className="grid gap-4">
            <div>
              <label className="label" htmlFor="name">Nome do produto *</label>
              <input
                id="name"
                className="field"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Ex.: Ignite V150 - 15.000 Puffs"
              />
            </div>
            <div>
              <label className="label" htmlFor="summary">Resumo (aparece no card)</label>
              <input
                id="summary"
                className="field"
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
                placeholder="Uma frase curta que vende o produto"
              />
            </div>
            <div>
              <label className="label" htmlFor="description">Descrição completa</label>
              <textarea
                id="description"
                className="field min-h-32 resize-y"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="slug">Link (slug)</label>
              <input
                id="slug"
                className="field"
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder="gerado a partir do nome"
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ variantes */}
        <section className="surface p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-bold text-white">Variantes (sabores / modelos)</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set("variants", [
                  ...form.variants,
                  { name: "", sku: "", price: "", stock: "0", lowStockAlert: "5", active: true },
                ])
              }
            >
              <Plus size={14} /> Adicionar
            </Button>
          </div>
          <p className="mb-4 text-xs text-white/40">
            O estoque vive na variante. Produtos sem sabores usam uma variante única chamada
            &ldquo;Padrão&rdquo;.
          </p>

          <div className="space-y-3">
            {form.variants.map((variant, index) => (
              <div key={variant.id ?? index} className="rounded-xl border border-white/10 p-3.5">
                <div className="flex items-start gap-3">
                  <GripVertical size={16} className="mt-2.5 shrink-0 text-white/20" />
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="label">Nome da variante *</label>
                      <input
                        className="field"
                        required
                        value={variant.name}
                        onChange={(e) => setVariant(index, { name: e.target.value })}
                        placeholder="Blue Razz Ice"
                      />
                    </div>
                    <div>
                      <label className="label">SKU</label>
                      <input
                        className="field"
                        value={variant.sku}
                        onChange={(e) => setVariant(index, { sku: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="label">Preço próprio (opcional)</label>
                      <input
                        className="field"
                        inputMode="decimal"
                        value={variant.price}
                        onChange={(e) => setVariant(index, { price: e.target.value })}
                        placeholder="usa o preço do produto"
                      />
                    </div>
                    <div>
                      <label className="label">
                        {variant.id ? "Estoque atual" : "Estoque inicial"}
                      </label>
                      <input
                        className="field"
                        inputMode="numeric"
                        disabled={Boolean(variant.id)}
                        value={variant.stock}
                        onChange={(e) => setVariant(index, { stock: e.target.value })}
                      />
                      {variant.id && (
                        <Link
                          href="/admin/estoque"
                          className="mt-1 block text-[11px] text-brand-200 hover:text-white"
                        >
                          Alterar em Estoque →
                        </Link>
                      )}
                    </div>
                    <div>
                      <label className="label">Alerta de estoque baixo</label>
                      <input
                        className="field"
                        inputMode="numeric"
                        value={variant.lowStockAlert}
                        onChange={(e) => setVariant(index, { lowStockAlert: e.target.value })}
                      />
                    </div>
                    <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-white/70">
                      <input
                        type="checkbox"
                        className="size-4 accent-brand-500"
                        checked={variant.active}
                        onChange={(e) => setVariant(index, { active: e.target.checked })}
                      />
                      Ativa na loja
                    </label>
                  </div>

                  {form.variants.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remover variante"
                      onClick={() =>
                        set(
                          "variants",
                          form.variants.filter((_, i) => i !== index),
                        )
                      }
                      className="mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-white/35 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------- imagens */}
        <section className="surface p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="font-bold text-white">Imagens</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => set("images", [...form.images, { url: "", alt: "" }])}
            >
              <Plus size={14} /> Colar URL
            </Button>
          </div>
          <p className="mb-4 text-xs text-white/40">
            A primeira imagem vira a capa. Sem imagem, o card mostra um placeholder com as
            iniciais.
          </p>

          <ImageUploader
            folder="produtos"
            multiple
            className="mb-4"
            hint="JPG, PNG ou WebP — convertemos para WebP antes de enviar."
            onUploaded={(urls) =>
              setForm((f) => ({
                ...f,
                images: [...f.images, ...urls.map((url) => ({ url, alt: "" }))],
              }))
            }
          />

          {form.images.length === 0 ? (
            <p className="text-sm text-white/35">Nenhuma imagem cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {form.images.map((image, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-ink-800">
                    {image.url.trim() && (
                      <Image
                        src={image.url}
                        alt=""
                        fill
                        unoptimized
                        sizes="44px"
                        className="object-cover"
                      />
                    )}
                    {index === 0 && (
                      <span className="absolute inset-x-0 bottom-0 bg-black/65 text-center text-[9px] font-bold uppercase text-white">
                        capa
                      </span>
                    )}
                  </span>
                  <input
                    className="field flex-1"
                    value={image.url}
                    onChange={(e) =>
                      set(
                        "images",
                        form.images.map((img, i) =>
                          i === index ? { ...img, url: e.target.value } : img,
                        ),
                      )
                    }
                    placeholder="https://…"
                  />
                  {index > 0 && (
                    <button
                      type="button"
                      aria-label="Usar como capa"
                      title="Usar como capa"
                      onClick={() =>
                        set("images", [
                          form.images[index],
                          ...form.images.filter((_, i) => i !== index),
                        ])
                      }
                      className="grid size-11 shrink-0 place-items-center rounded-xl text-white/35 hover:bg-white/5 hover:text-white"
                    >
                      <ArrowUp size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Remover imagem"
                    onClick={() => set("images", form.images.filter((_, i) => i !== index))}
                    className="grid size-11 shrink-0 place-items-center rounded-xl text-white/35 hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ---------------------------------------------------------- lateral */}
      <div className="space-y-6">
        <section className="surface p-5">
          <h2 className="mb-4 font-bold text-white">Preço</h2>
          <div className="grid gap-4">
            <div>
              <label className="label" htmlFor="price">Preço de venda *</label>
              <input
                id="price"
                className="field"
                required
                inputMode="decimal"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="129,90"
              />
            </div>
            <div>
              <label className="label" htmlFor="compareAt">Preço &ldquo;de&rdquo; (riscado)</label>
              <input
                id="compareAt"
                className="field"
                inputMode="decimal"
                value={form.compareAt}
                onChange={(e) => set("compareAt", e.target.value)}
                placeholder="159,90"
              />
            </div>
            <div>
              <label className="label" htmlFor="cost">Custo (só para a sua margem)</label>
              <input
                id="cost"
                className="field"
                inputMode="decimal"
                value={form.cost}
                onChange={(e) => set("cost", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="mb-4 font-bold text-white">Organização</h2>
          <div className="grid gap-4">
            <div>
              <label className="label" htmlFor="categoryId">Categoria</label>
              <select
                id="categoryId"
                className="field"
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="" className="bg-ink-850">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-ink-850">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="brandId">Marca</label>
              <select
                id="brandId"
                className="field"
                value={form.brandId}
                onChange={(e) => set("brandId", e.target.value)}
              >
                <option value="" className="bg-ink-850">Sem marca</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id} className="bg-ink-850">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-white/70">
              <input
                type="checkbox"
                className="size-4 accent-brand-500"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
              />
              Visível na loja
            </label>
            <label className="flex items-center gap-2.5 text-sm text-white/70">
              <input
                type="checkbox"
                className="size-4 accent-brand-500"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              Destacar na home
            </label>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="mb-4 font-bold text-white">Ficha técnica</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="puffs">Puffs</label>
              <input
                id="puffs"
                className="field"
                inputMode="numeric"
                value={form.puffs}
                onChange={(e) => set("puffs", e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="nicotineMg">Nicotina</label>
              <input
                id="nicotineMg"
                className="field"
                value={form.nicotineMg}
                onChange={(e) => set("nicotineMg", e.target.value)}
                placeholder="5% (50mg)"
              />
            </div>
            <div>
              <label className="label" htmlFor="liquidMl">Líquido</label>
              <input
                id="liquidMl"
                className="field"
                value={form.liquidMl}
                onChange={(e) => set("liquidMl", e.target.value)}
                placeholder="12ml"
              />
            </div>
            <div>
              <label className="label" htmlFor="batteryMah">Bateria (mAh)</label>
              <input
                id="batteryMah"
                className="field"
                inputMode="numeric"
                value={form.batteryMah}
                onChange={(e) => set("batteryMah", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="rechargeable">Recarregável</label>
              <select
                id="rechargeable"
                className="field"
                value={form.rechargeable}
                onChange={(e) => set("rechargeable", e.target.value as ProductFormData["rechargeable"])}
              >
                <option value="" className="bg-ink-850">Não informar</option>
                <option value="sim" className="bg-ink-850">Sim</option>
                <option value="nao" className="bg-ink-850">Não</option>
              </select>
            </div>
          </div>
        </section>

        <div className="surface sticky bottom-4 flex flex-wrap items-center gap-3 p-4">
          <Button type="submit" size="lg" className="flex-1" disabled={pending}>
            {pending && <Loader2 size={16} className="animate-spin" />}
            {pending ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar produto"}
          </Button>
          {isEdit && form.slug && (
            <Link
              href={`/produto/${form.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm text-white/45 hover:text-white"
            >
              <ExternalLink size={14} /> Ver na loja
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}
