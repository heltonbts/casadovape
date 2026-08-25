"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/admin/catalog-managers";
import { deleteCouponAction, saveCouponAction } from "@/app/actions/admin/marketing";
import { brl, fromCents, toCents } from "@/lib/utils";

export type CouponRow = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSubtotalCents: number;
  maxUses: number | null;
  uses: number;
  active: boolean;
  expiresAt: string | null;
};

const EMPTY = {
  code: "",
  type: "PERCENT" as "PERCENT" | "FIXED",
  value: "",
  minSubtotal: "",
  maxUses: "",
  active: true,
  expiresAt: "",
};

export function CouponManager({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  function startEdit(coupon: CouponRow) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.type === "PERCENT" ? String(coupon.value) : fromCents(coupon.value),
      minSubtotal: coupon.minSubtotalCents ? fromCents(coupon.minSubtotalCents) : "",
      maxUses: coupon.maxUses?.toString() ?? "",
      active: coupon.active,
      expiresAt: coupon.expiresAt?.slice(0, 10) ?? "",
    });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveCouponAction({
        id: editingId ?? undefined,
        code: form.code,
        type: form.type,
        // PERCENT guarda o número puro (10 = 10%); FIXED guarda centavos.
        value: form.type === "PERCENT" ? Number.parseInt(form.value || "0", 10) : toCents(form.value),
        minSubtotalCents: form.minSubtotal ? toCents(form.minSubtotal) : 0,
        maxUses: form.maxUses ? Number.parseInt(form.maxUses, 10) : null,
        active: form.active,
        expiresAt: form.expiresAt || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editingId ? "Cupom atualizado" : "Cupom criado");
      reset();
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_330px] lg:items-start">
      <ul className="surface divide-y divide-white/5">
        {coupons.length === 0 && (
          <li className="p-5 text-sm text-white/40">Nenhum cupom cadastrado.</li>
        )}
        {coupons.map((coupon) => {
          const expired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;
          const exhausted = coupon.maxUses !== null && coupon.uses >= coupon.maxUses;
          return (
            <li key={coupon.id} className="flex items-center gap-3 p-4">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <code className="font-bold text-white">{coupon.code}</code>
                  <Badge tone="accent">
                    {coupon.type === "PERCENT" ? `${coupon.value}%` : brl(coupon.value)}
                  </Badge>
                  {!coupon.active && <Badge tone="neutral">Inativo</Badge>}
                  {expired && <Badge tone="danger">Expirado</Badge>}
                  {exhausted && <Badge tone="warning">Esgotado</Badge>}
                </span>
                <span className="mt-1 block text-xs text-white/40">
                  {coupon.minSubtotalCents > 0
                    ? `Mínimo ${brl(coupon.minSubtotalCents)} · `
                    : ""}
                  {coupon.uses} usos{coupon.maxUses ? ` de ${coupon.maxUses}` : ""}
                  {coupon.expiresAt
                    ? ` · até ${new Date(coupon.expiresAt).toLocaleDateString("pt-BR")}`
                    : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() => startEdit(coupon)}
                aria-label={`Editar ${coupon.code}`}
                className="grid size-8 place-items-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
              >
                <Pencil size={15} />
              </button>
              <DeleteButton label={coupon.code} onDelete={() => deleteCouponAction(coupon.id)} />
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="surface sticky top-6 space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">{editingId ? "Editar cupom" : "Novo cupom"}</h3>
          {editingId && (
            <button type="button" onClick={reset} aria-label="Cancelar edição" className="text-white/40 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>

        <div>
          <label className="label">Código *</label>
          <input
            className="field uppercase"
            required
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="PIX10"
          />
        </div>

        <div>
          <span className="label">Tipo</span>
          <div className="grid grid-cols-2 gap-2">
            {(["PERCENT", "FIXED"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type }))}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  form.type === type
                    ? "border-brand-400 bg-brand-500/15 font-semibold text-brand-200"
                    : "border-white/10 text-white/60 hover:border-white/25"
                }`}
              >
                {type === "PERCENT" ? "Percentual" : "Valor fixo"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">{form.type === "PERCENT" ? "Desconto (%)" : "Desconto (R$)"}</label>
          <input
            className="field"
            required
            inputMode="decimal"
            value={form.value}
            onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            placeholder={form.type === "PERCENT" ? "10" : "15,00"}
          />
        </div>
        <div>
          <label className="label">Compra mínima (R$)</label>
          <input
            className="field"
            inputMode="decimal"
            value={form.minSubtotal}
            onChange={(e) => setForm((f) => ({ ...f, minSubtotal: e.target.value }))}
            placeholder="sem mínimo"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Limite de usos</label>
            <input
              className="field"
              inputMode="numeric"
              value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              placeholder="ilimitado"
            />
          </div>
          <div>
            <label className="label">Expira em</label>
            <input
              type="date"
              className="field"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm text-white/70">
          <input
            type="checkbox"
            className="size-4 accent-brand-500"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
          />
          Cupom ativo
        </label>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {editingId ? "Salvar" : "Criar cupom"}
        </Button>
      </form>
    </div>
  );
}
