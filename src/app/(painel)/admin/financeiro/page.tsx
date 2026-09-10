import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Clock, Minus } from "lucide-react";
import { EmptyState, PageHeader, TableWrap, Td, Th } from "@/components/admin/ui";
import { FinanceFilters } from "@/components/admin/finance-filters";
import { getFinanceReport } from "@/lib/finance";
import { resolvePeriod, type Period } from "@/lib/finance-period";
import { PAYMENT_LABEL } from "@/lib/order-labels";
import { brl, cn, formatShortDay, toDateInput } from "@/lib/utils";

export const metadata = { title: "Financeiro" };

/** Violeta = lucro, ciano = custo. Par validado para daltonismo no fundo escuro. */
const PROFIT_FILL = "bg-brand-400";
const COST_FILL = "bg-cyan-600";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FinanceiroPage(props: PageProps<"/admin/financeiro">) {
  const sp = await props.searchParams;
  const period = resolvePeriod({
    periodo: one(sp.periodo),
    de: one(sp.de),
    ate: one(sp.ate),
  });
  const report = await getFinanceReport(period);
  const { totals, previous, daily } = report;

  const maxDay = Math.max(1, ...daily.map((d) => d.merchandise));

  return (
    <>
      <PageHeader
        title="Financeiro"
        description={`Faturamento e lucro de ${rangeLabel(period)}. Só pedidos pagos, enviados ou entregues entram na conta.`}
      />

      <FinanceFilters period={period} today={toDateInput(new Date())} />

      {/* ------------------------------------------------------------ KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Faturamento"
          value={brl(totals.revenue)}
          hint={`${totals.orders} ${totals.orders === 1 ? "pedido" : "pedidos"} · frete ${brl(totals.shipping)}`}
          delta={delta(totals.revenue, previous.revenue)}
        />
        <Kpi
          label="Lucro"
          value={brl(totals.profit)}
          hint={`Margem de ${(totals.margin * 100).toFixed(1).replace(".", ",")}% sobre a mercadoria`}
          delta={delta(totals.profit, previous.profit)}
          tone={totals.profit < 0 ? "danger" : "brand"}
        />
        <Kpi
          label="Custo das mercadorias"
          value={brl(totals.cost)}
          hint={`${totals.units} ${totals.units === 1 ? "unidade vendida" : "unidades vendidas"}`}
        />
        <Kpi
          label="Ticket médio"
          value={brl(totals.avgTicket)}
          hint={`Período anterior: ${brl(previous.avgTicket)}`}
          delta={delta(totals.avgTicket, previous.avgTicket)}
        />
      </div>

      {totals.unitsWithoutCost > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-card border border-amber-400/25 bg-amber-400/8 p-4 text-sm text-amber-100/90">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" />
          <p>
            {totals.unitsWithoutCost}{" "}
            {totals.unitsWithoutCost === 1 ? "unidade vendida está" : "unidades vendidas estão"} sem
            custo cadastrado, então o lucro acima está{" "}
            <strong className="font-semibold">maior do que o real</strong>.{" "}
            <Link href="/admin/produtos" className="underline underline-offset-2 hover:text-white">
              Informe o custo dos produtos
            </Link>{" "}
            para o número fechar.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* ------------------------------------------------- lucro por dia */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-white">Dia a dia</h2>
            <Legend />
          </div>

          {daily.length === 0 ? (
            <EmptyState
              title="Nenhuma venda no período"
              description="Assim que um pedido for finalizado, ele aparece aqui."
            />
          ) : (
            <div className="surface divide-y divide-white/5">
              {daily.map((d) => {
                const costShare = d.merchandise > 0 ? Math.min(1, d.cost / d.merchandise) : 0;
                return (
                  <div key={d.day} className="p-3.5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                      <span className="font-medium text-white">{formatShortDay(d.day)}</span>
                      <span className="text-xs text-white/40">
                        {d.orders} {d.orders === 1 ? "pedido" : "pedidos"}
                      </span>
                      <span className="ml-auto tabular-nums text-white/70">{brl(d.revenue)}</span>
                      <span
                        className={cn(
                          "w-24 text-right font-semibold tabular-nums",
                          d.profit < 0 ? "text-red-300" : "text-brand-200",
                        )}
                      >
                        {brl(d.profit)}
                      </span>
                    </div>

                    {/* Barra empilhada: custo + lucro = venda de mercadoria do dia. */}
                    <div
                      className="mt-2 flex h-2.5 gap-0.5 rounded-full"
                      style={{ width: `${Math.max(6, (d.merchandise / maxDay) * 100)}%` }}
                      aria-hidden
                    >
                      <span
                        className={cn("h-full rounded-l-full", COST_FILL)}
                        style={{ width: `${costShare * 100}%` }}
                      />
                      <span className={cn("h-full flex-1 rounded-r-full", PROFIT_FILL)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ------------------------------------------- composição do lucro */}
          <div className="surface mt-6 p-5">
            <h3 className="mb-4 font-bold text-white">Como o lucro se forma</h3>
            <dl className="space-y-2.5 text-sm">
              <Line label="Subtotal dos produtos" value={totals.subtotal} />
              <Line label="Descontos e cupons" value={-totals.discount} />
              {totals.adjustment !== 0 && (
                <Line label="Ajustes no fechamento" value={totals.adjustment} />
              )}
              <Line label="Custo das mercadorias" value={-totals.cost} />
              <div className="flex items-center justify-between border-t border-white/8 pt-3">
                <dt className="font-semibold text-white">Lucro do período</dt>
                <dd
                  className={cn(
                    "text-lg font-black tabular-nums",
                    totals.profit < 0 ? "text-red-300" : "text-brand-200",
                  )}
                >
                  {brl(totals.profit)}
                </dd>
              </div>
              <p className="text-xs text-white/40">
                O frete cobrado ({brl(totals.shipping)}) entra no faturamento, mas fica fora do
                lucro — é repasse da entrega, não margem da venda.
              </p>
            </dl>
          </div>
        </section>

        <div className="space-y-6">
          {/* --------------------------------------------------- a receber */}
          <div className="surface flex items-start gap-3 p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-400/10">
              <Clock size={17} className="text-amber-300" />
            </span>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-white/40">A confirmar</p>
              <p className="mt-1 text-xl font-black text-white">{brl(report.pending.revenue)}</p>
              <p className="mt-1 text-xs text-white/40">
                {report.pending.orders} aguardando pagamento
                {report.canceledOrders > 0 &&
                  ` · ${report.canceledOrders} ${report.canceledOrders === 1 ? "cancelado" : "cancelados"}`}
              </p>
            </div>
          </div>

          {/* --------------------------------------- formas de pagamento */}
          <section>
            <h2 className="mb-3 font-bold text-white">Formas de pagamento</h2>
            {report.byPayment.length === 0 ? (
              <div className="surface p-5 text-sm text-white/45">Sem vendas no período.</div>
            ) : (
              <ul className="surface divide-y divide-white/5">
                {report.byPayment.map((p) => (
                  <li key={p.method} className="flex items-center gap-3 p-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">
                        {PAYMENT_LABEL[p.method]}
                      </span>
                      <span className="text-xs text-white/40">
                        {p.orders} {p.orders === 1 ? "pedido" : "pedidos"}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                      {brl(p.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ----------------------------------------- quem dá mais lucro */}
          <section>
            <div className="mb-3">
              <h2 className="font-bold text-white">Produtos que mais deram lucro</h2>
              <p className="text-xs text-white/35">
                Por item vendido — ajustes feitos no fechamento do pedido ficam de fora.
              </p>
            </div>
            {report.topProducts.length === 0 ? (
              <div className="surface p-5 text-sm text-white/45">Sem vendas no período.</div>
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Produto</Th>
                    <Th className="text-right">Vendido</Th>
                    <Th className="text-right">Lucro</Th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((p) => (
                    <tr key={p.name} className="hover:bg-white/[0.02]">
                      <Td>
                        <span className="block truncate text-white">{p.name}</span>
                        <span className="text-xs text-white/35">
                          {p.units} un.
                          {!p.hasCost && " · sem custo cadastrado"}
                        </span>
                      </Td>
                      <Td className="text-right tabular-nums">{brl(p.revenue)}</Td>
                      <Td
                        className={cn(
                          "text-right font-semibold tabular-nums",
                          p.profit < 0 ? "text-red-300" : "text-brand-200",
                        )}
                      >
                        {brl(p.profit)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ peças */

function rangeLabel(period: Period) {
  if (period.key === "hoje") return "hoje";
  if (period.from === period.to) return formatShortDay(period.from);
  return `${formatShortDay(period.from)} a ${formatShortDay(period.to)}`;
}

/** Variação percentual contra o período anterior de mesmo tamanho. */
function delta(current: number, before: number) {
  if (before === 0) return current === 0 ? 0 : null;
  return (current - before) / Math.abs(before);
}

function Kpi({
  label,
  value,
  hint,
  delta,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  tone?: "brand" | "danger";
}) {
  const up = delta != null && delta > 0;
  const down = delta != null && delta < 0;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;

  return (
    <div className="surface p-5">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-black",
          tone === "danger" ? "text-red-300" : tone === "brand" ? "text-brand-200" : "text-white",
        )}
      >
        {value}
      </p>
      {delta !== undefined && (
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-xs font-medium",
            up ? "text-emerald-300" : down ? "text-red-300" : "text-white/40",
          )}
        >
          {delta === null ? (
            <span className="text-white/40">sem base de comparação</span>
          ) : (
            <>
              <Icon size={13} />
              {(Math.abs(delta) * 100).toFixed(0)}% vs. período anterior
            </>
          )}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-white/45">
      <span className="flex items-center gap-1.5">
        <span className={cn("size-2.5 rounded-full", COST_FILL)} /> Custo
      </span>
      <span className="flex items-center gap-1.5">
        <span className={cn("size-2.5 rounded-full", PROFIT_FILL)} /> Lucro
      </span>
    </div>
  );
}

function Line({ label, value: raw }: { label: string; value: number }) {
  const value = raw || 0; // evita o "-R$ 0,00" que o -0 produz
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/55">{label}</dt>
      <dd className={cn("tabular-nums", value < 0 ? "text-white/70" : "text-white")}>
        {value < 0 ? `− ${brl(Math.abs(value))}` : brl(value)}
      </dd>
    </div>
  );
}
