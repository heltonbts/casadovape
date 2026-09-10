"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { registerMovementAction } from "@/app/actions/admin/stock";
import { cn } from "@/lib/utils";

const TYPES = [
  { value: "IN", label: "Entrada", hint: "Chegou mercadoria do fornecedor" },
  { value: "OUT", label: "Saída", hint: "Saída manual (venda no balcão, brinde)" },
  { value: "LOSS", label: "Perda", hint: "Quebra, vencimento, furto" },
  { value: "ADJUST", label: "Ajuste", hint: "Correção de inventário (aceita negativo)" },
] as const;

type MovementType = (typeof TYPES)[number]["value"];

export function StockMovementForm({
  variants,
  defaultVariantId,
}: {
  variants: { id: string; label: string; stock: number }[];
  defaultVariantId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [variantId, setVariantId] = useState(defaultVariantId ?? variants[0]?.id ?? "");
  const [type, setType] = useState<MovementType>("IN");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const selected = variants.find((v) => v.id === variantId);
  const active = TYPES.find((t) => t.value === type)!;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsed) || parsed === 0) {
      toast.error("Informe uma quantidade");
      return;
    }

    startTransition(async () => {
      const result = await registerMovementAction({ variantId, type, quantity: parsed, reason });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Movimentação registrada. Novo saldo: ${result.balance}`);
      setQuantity("");
      setReason("");
      router.refresh();
    });
  }

  if (variants.length === 0) {
    return <p className="text-sm text-white/45">Cadastre um produto para movimentar estoque.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <span className="label">Variante</span>
        <VariantPicker variants={variants} value={variantId} onChange={setVariantId} />
      </div>

      <div>
        <span className="label">Tipo</span>
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                type === t.value
                  ? "border-brand-400 bg-brand-500/15 font-semibold text-brand-200"
                  : "border-white/10 text-white/60 hover:border-white/25"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-white/40">{active.hint}</p>
      </div>

      <div>
        <label className="label" htmlFor="quantity">
          Quantidade {type === "ADJUST" && "(use - para reduzir)"}
        </label>
        <input
          id="quantity"
          className="field"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value.replace(/[^\d-]/g, ""))}
          placeholder={type === "ADJUST" ? "-3" : "10"}
        />
        {selected && quantity && (
          <p className="mt-1.5 text-xs text-white/45">
            Saldo depois:{" "}
            <strong className="text-white">
              {selected.stock +
                (type === "IN"
                  ? Math.abs(Number(quantity) || 0)
                  : type === "ADJUST"
                    ? Number(quantity) || 0
                    : -Math.abs(Number(quantity) || 0))}
            </strong>
          </p>
        )}
      </div>

      <div>
        <label className="label" htmlFor="reason">Motivo (opcional)</label>
        <input
          id="reason"
          className="field"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: NF 1234 do fornecedor"
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 size={15} className="animate-spin" />}
        {pending ? "Registrando…" : "Registrar movimentação"}
      </Button>
    </form>
  );
}

type Variant = { id: string; label: string; stock: number };

/** Tira acento e caixa: "Abacaxi Ice" acha com "abacaxi ice". */
const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * A loja tem uma variante por sabor, então a lista passa de cem itens — num
 * <select> nativo achar "Abacaxi ice" vira rolagem no escuro. Aqui a busca
 * casa todos os termos digitados contra "produto — sabor", em qualquer ordem.
 */
function VariantPicker({
  variants,
  value,
  onChange,
}: {
  variants: Variant[];
  value: string;
  onChange: (id: string) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  const selected = variants.find((v) => v.id === value);

  const matches = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return variants;
    return variants.filter((v) => {
      const haystack = normalize(v.label);
      return terms.every((term) => haystack.includes(term));
    });
  }, [variants, query]);

  // Fecha ao clicar fora — o painel é absoluto e não captura o clique.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Mantém a opção destacada visível enquanto se navega pelo teclado.
  useEffect(() => {
    optionRefs.current[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function choose(variant: Variant) {
    onChange(variant.id);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (matches.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((i) => (i + delta + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const match = matches[highlight];
      if (match) choose(match);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        title={selected?.label}
        className="field flex items-center justify-between gap-2 text-left"
      >
        <span className={cn("truncate", !selected && "text-white/35")}>
          {selected ? `${selected.label} — ${selected.stock} un.` : "Escolha a variante"}
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-white/35" />
      </button>

      {/* O painel cresce para a esquerda: o formulário mora numa coluna estreita,
          e "Elfbar TE 30.000 Puffs — Abacaxi ice" cortado vira duas linhas
          idênticas na tela. */}
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-max min-w-full max-w-[min(30rem,80vw)] overflow-hidden rounded-xl border border-white/10 bg-ink-850 shadow-2xl shadow-black/60">
          <div className="relative border-b border-white/8">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Buscar produto ou sabor…"
              aria-label="Buscar variante"
              aria-controls={listId}
              className="w-full bg-transparent py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/35"
            />
          </div>

          {matches.length === 0 ? (
            <p className="px-3 py-4 text-sm text-white/45">Nenhuma variante com esse termo.</p>
          ) : (
            <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {matches.map((variant, i) => (
                <li
                  key={variant.id}
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  role="option"
                  aria-selected={variant.id === value}
                  onPointerEnter={() => setHighlight(i)}
                  onClick={() => choose(variant)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                    i === highlight ? "bg-brand-500/15 text-white" : "text-white/75",
                  )}
                >
                  <Check
                    size={14}
                    className={cn(
                      "shrink-0 text-brand-200",
                      variant.id === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{variant.label}</span>
                  <span
                    className={cn(
                      "shrink-0 text-xs tabular-nums",
                      variant.stock === 0 ? "text-red-300" : "text-white/40",
                    )}
                  >
                    {variant.stock} un.
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
