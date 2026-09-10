"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarRange } from "lucide-react";
import { PERIODS, PERIOD_LABEL, type Period } from "@/lib/finance-period";
import { cn } from "@/lib/utils";

/**
 * Os chips só trocam a query string — a página é um Server Component e refaz
 * as contas no servidor. O formulário de datas aparece apenas em
 * "Personalizado" para não poluir o filtro do dia a dia.
 */
export function FinanceFilters({ period, today }: { period: Period; today: string }) {
  const router = useRouter();
  const [from, setFrom] = useState(period.from);
  const [to, setTo] = useState(period.to);

  const apply = (nextFrom: string, nextTo: string) => {
    const a = nextFrom > nextTo ? nextTo : nextFrom;
    const b = nextFrom > nextTo ? nextFrom : nextTo;
    router.push(`/admin/financeiro?periodo=personalizado&de=${a}&ate=${b}`);
  };

  return (
    <div className="mb-6 space-y-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {PERIODS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() =>
              key === "personalizado"
                ? apply(from, to)
                : router.push(`/admin/financeiro?periodo=${key}`)
            }
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition",
              period.key === key
                ? "border-brand-400 bg-brand-500/15 font-semibold text-brand-200"
                : "border-white/10 text-white/60 hover:border-white/25 hover:text-white",
            )}
          >
            {key === "personalizado" && <CalendarRange size={15} />}
            {PERIOD_LABEL[key]}
          </button>
        ))}
      </div>

      {period.key === "personalizado" && (
        <form
          className="surface flex flex-wrap items-end gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            apply(from, to);
          }}
        >
          <label className="min-w-36 flex-1">
            <span className="label">De</span>
            <input
              type="date"
              className="field"
              value={from}
              max={today}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="min-w-36 flex-1">
            <span className="label">Até</span>
            <input
              type="date"
              className="field"
              value={to}
              max={today}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400"
          >
            Aplicar
          </button>
        </form>
      )}
    </div>
  );
}
