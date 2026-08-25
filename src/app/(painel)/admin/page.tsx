import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, StatCard, Td, TableWrap, Th } from "@/components/admin/ui";
import { getDashboardStats } from "@/lib/admin-stats";
import { ORDER_STATUS } from "@/lib/order-labels";
import { brl, formatDate } from "@/lib/utils";

export const metadata = { title: "Visão geral" };

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <>
      <PageHeader title="Visão geral" description="Como a loja está indo hoje." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Vendas hoje"
          value={brl(stats.todayRevenue)}
          hint={`${stats.todayOrders} ${stats.todayOrders === 1 ? "pedido" : "pedidos"}`}
        />
        <StatCard
          label="Últimos 30 dias"
          value={brl(stats.monthRevenue)}
          hint={`${stats.monthOrders} pedidos pagos`}
          tone="accent"
        />
        <StatCard label="Ticket médio" value={brl(stats.avgTicket)} hint="Todos os pedidos pagos" />
        <StatCard
          label="Aguardando pagamento"
          value={String(stats.pendingOrders)}
          hint="Pedidos a confirmar no WhatsApp"
          tone={stats.pendingOrders > 0 ? "warning" : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* ------------------------------------------------ últimos pedidos */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-white">Últimos pedidos</h2>
            <Link href="/admin/pedidos" className="text-sm text-brand-200 hover:text-white">
              Ver todos →
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <EmptyState title="Nenhum pedido ainda" description="Quando alguém comprar, aparece aqui." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Pedido</Th>
                  <Th>Cliente</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Total</Th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => {
                  const status = ORDER_STATUS[order.status];
                  return (
                    <tr key={order.id} className="hover:bg-white/[0.02]">
                      <Td>
                        <Link
                          href={`/admin/pedidos/${order.id}`}
                          className="font-semibold text-white hover:text-brand-200"
                        >
                          #{order.number}
                        </Link>
                        <span className="block text-xs text-white/35">
                          {formatDate(order.createdAt)}
                        </span>
                      </Td>
                      <Td>
                        <span className="block truncate">{order.customerName}</span>
                        <span className="text-xs text-white/35">
                          {order.items.reduce((s, i) => s + i.quantity, 0)} itens
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </Td>
                      <Td className="text-right font-semibold text-white">{brl(order.totalCents)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableWrap>
          )}
        </section>

        <div className="space-y-6">
          {/* --------------------------------------------- estoque baixo */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-white">
                <AlertTriangle size={16} className="text-amber-300" /> Estoque baixo
              </h2>
              <Link href="/admin/estoque" className="text-sm text-brand-200 hover:text-white">
                Repor →
              </Link>
            </div>

            {stats.lowStock.length === 0 ? (
              <div className="surface p-5 text-sm text-white/45">
                Nenhuma variante abaixo do alerta. Estoque saudável.
              </div>
            ) : (
              <ul className="surface divide-y divide-white/5">
                {stats.lowStock.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 p-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-white">{v.productName}</span>
                      <span className="text-xs text-white/40">{v.name}</span>
                    </span>
                    <Badge tone={v.stock === 0 ? "danger" : "warning"}>
                      {v.stock === 0 ? "Esgotado" : `${v.stock} un.`}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ------------------------------------------- mais vendidos */}
          <section>
            <h2 className="mb-3 font-bold text-white">Mais vendidos</h2>
            {stats.topItems.length === 0 ? (
              <div className="surface p-5 text-sm text-white/45">Ainda sem vendas confirmadas.</div>
            ) : (
              <ul className="surface divide-y divide-white/5">
                {stats.topItems.map((item, i) => (
                  <li key={item.productName} className="flex items-center gap-3 p-3.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/5 text-xs font-bold text-white/60">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-white">
                      {item.productName}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold text-white">
                        {item._sum.quantity} un.
                      </span>
                      <span className="text-xs text-white/35">{brl(item._sum.totalCents ?? 0)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Link
            href="/admin/produtos/novo"
            className="surface flex items-center justify-between p-5 transition hover:border-brand-400/50"
          >
            <span>
              <span className="block font-semibold text-white">Cadastrar produto</span>
              <span className="text-sm text-white/45">Adicione um novo item ao catálogo</span>
            </span>
            <ArrowRight size={18} className="text-brand-200" />
          </Link>
        </div>
      </div>
    </>
  );
}
