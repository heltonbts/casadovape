"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { registerMovementAction } from "@/app/actions/admin/stock";

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
        <label className="label" htmlFor="variant">Variante</label>
        <select
          id="variant"
          className="field"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id} className="bg-ink-850">
              {v.label} — {v.stock} un.
            </option>
          ))}
        </select>
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
