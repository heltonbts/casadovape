"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, ExternalLink, GripVertical, Loader2, Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { VariantPicker } from "@/components/admin/variant-picker";
import { saveProductAction } from "@/app/actions/admin/products";
import { comboStock } from "@/lib/combo";
import { brl, toCents } from "@/lib/utils";

type VariantRow = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  lowStockAlert: string;
  active: boolean;
};

export type ComboRow = { variantId: string; quantity: string };

/** Uma variante do catálogo, do jeito que o montador de combo precisa dela. */
export type ComboSourceVariant = {
  id: string;
  label: string;
  stock: number;
  priceCents: number;
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
  isCombo: boolean;
  comboItems: ComboRow[];
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
  isCombo: false,
  comboItems: [],
};

const numberOrNull = (v: string) => {
  const n = Number.parseInt(v.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

export function ProductForm({
  initial,
  categories,
  brands,
  variants: catalogVariants,
}: {
  initial: ProductFormData;
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
  /** Todas as variantes vendáveis da loja — a matéria-prima dos combos. */
  variants: ComboSourceVariant[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(initial.id);

  const set = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // ------------------------------------------------------------- combo
  const pickerOptions = useMemo(
    () => catalogVariants.map(({ id, label, stock }) => ({ id, label, stock })),
    [catalogVariants],
  );

  /** Só as linhas que já apontam para uma variante de verdade. */
  const chosenCombo = useMemo(
    () =>
      form.comboItems
        .map((row) => {
          const variant = catalogVariants.find((v) => v.id === row.variantId);
          if (!variant) return null;
          return { variant, quantity: Math.max(1, Number.parseInt(row.quantity || "1", 10) || 1) };
        })
        .filter((row): row is { variant: ComboSourceVariant; quantity: number } => row !== null),
    [form.comboItems, catalogVariants],
  );

  const looseTotal = chosenCombo.reduce(
    (sum, row) => sum + row.variant.priceCents * row.quantity,
    0,
  );
  const comboPrice = form.price.trim() ? toCents(form.price) : 0;
  const savings = looseTotal - comboPrice;
  const available = comboStock(
    chosenCombo.map((row) => ({ quantity: row.quantity, variant: { stock: row.variant.stock } })),
  );

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
        isCombo: form.isCombo,
        comboItems: form.isCombo
          ? form.comboItems
              .filter((c) => c.variantId)
              .map((c) => ({
                variantId: c.variantId,
                quantity: Math.max(1, Number.parseInt(c.quantity || "1", 10) || 1),
              }))
          : [],
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

        {/* ---------------------------------------------------------- combo */}
        <section className="surface p-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-brand-500"
              checked={form.isCombo}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  isCombo: e.target.checked,
                  // O combo vende como uma coisa só: uma variante única, sem
                  // estoque próprio. O saldo vem dos produtos de dentro.
                  variants: e.target.checked
                    ? [f.variants[0] ?? EMPTY_PRODUCT.variants[0]].map((v) => ({
                        ...v,
                        name: "Padrão",
                        stock: "0",
                        active: true,
                      }))
                    : f.variants,
                  comboItems:
                    e.target.checked && f.comboItems.length === 0
                      ? [
                          { variantId: "", quantity: "1" },
                          { variantId: "", quantity: "1" },
                        ]
                      : f.comboItems,
                }))
              }
            />
            <span>
              <span className="flex items-center gap-2 font-bold text-white">
                <Package size={16} className="text-brand-200" /> Este produto é um combo
              </span>
              <span className="mt-1 block text-xs text-white/45">
                Junta produtos que já existem no estoque. Vender um combo baixa cada item de
                dentro, e ele fica indisponível assim que faltar um deles.
              </span>
            </span>
          </label>

          {form.isCombo && (
            <div className="mt-5 border-t border-white/8 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-bold text-white">O que vem no combo</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    set("comboItems", [...form.comboItems, { variantId: "", quantity: "1" }])
                  }
                >
                  <Plus size={14} /> Adicionar item
                </Button>
              </div>

              <div className="space-y-2">
                {form.comboItems.map((item, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="label">Produto {index + 1}</span>
                      <VariantPicker
                        variants={pickerOptions}
                        value={item.variantId}
                        onChange={(variantId) =>
                          set(
                            "comboItems",
                            form.comboItems.map((c, i) =>
                              i === index ? { ...c, variantId } : c,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="w-20 shrink-0">
                      <span className="label">Qtd.</span>
                      <input
                        className="field"
                        inputMode="numeric"
                        value={item.quantity}
                        onChange={(e) =>
                          set(
                            "comboItems",
                            form.comboItems.map((c, i) =>
                              i === index
                                ? { ...c, quantity: e.target.value.replace(/\D/g, "") }
                                : c,
                            ),
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      aria-label="Remover item do combo"
                      onClick={() =>
                        set("comboItems", form.comboItems.filter((_, i) => i !== index))
                      }
                      className="grid size-11 shrink-0 place-items-center rounded-xl text-white/35 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              {chosenCombo.length < 2 ? (
                <p className="mt-3 text-xs text-amber-300/80">
                  Escolha pelo menos 2 produtos para o combo valer.
                </p>
              ) : (
                <dl className="mt-4 space-y-1.5 rounded-xl border border-white/8 bg-white/[0.02] p-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-white/50">Comprando avulso</dt>
                    <dd className="tabular-nums text-white/70">{brl(looseTotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-white/50">Preço do combo</dt>
                    <dd className="tabular-nums text-white">
                      {form.price.trim() ? brl(comboPrice) : "—"}
                    </dd>
                  </div>
                  {form.price.trim() && (
                    <div className="flex justify-between border-t border-white/8 pt-1.5">
                      <dt className="font-medium text-white">
                        {savings > 0 ? "O cliente economiza" : "Acima do avulso"}
                      </dt>
                      <dd
                        className={`font-semibold tabular-nums ${savings > 0 ? "text-emerald-300" : "text-amber-300"}`}
                      >
                        {brl(Math.abs(savings))}
                      </dd>
                    </div>
                  )}
                  <p className="!mt-3 text-xs text-white/40">
                    Dá para montar {available}{" "}
                    {available === 1 ? "combo" : "combos"} com o estoque de hoje.
                  </p>
                </dl>
              )}
            </div>
          )}
        </section>

        {/* ------------------------------------------------------ variantes */}
        {!form.isCombo && (
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
        )}

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
