import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, TableWrap, Td, Th } from "@/components/admin/ui";
import { OrderRowActions } from "@/components/admin/order-row-actions";
import { db } from "@/lib/db";
import { ORDER_STATUS, ORDER_STATUS_ORDER } from "@/lib/order-labels";
import { brl, cn, formatDate, formatPhone } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Pedidos" };

export default async function PedidosPage(props: PageProps<"/admin/pedidos">) {
  const sp = await props.searchParams;
  const statusParam = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = ORDER_STATUS_ORDER.includes(statusParam as OrderStatus)
    ? (statusParam as OrderStatus)
    : undefined;

  const [orders, counts] = await Promise.all([
    db.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: { select: { quantity: true } } },
    }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);

  const countOf = (s: OrderStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const totalAll = counts.reduce((sum, c) => sum + c._count, 0);

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Cada pedido nasce aguardando. Finalizar baixa o estoque e entra no faturamento; cancelar devolve."
      />

      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        <FilterChip href="/admin/pedidos" active={!status} label="Todos" count={totalAll} />
        {ORDER_STATUS_ORDER.map((s) => (
          <FilterChip
            key={s}
            href={`/admin/pedidos?status=${s}`}
            active={status === s}
            label={ORDER_STATUS[s].label}
            count={countOf(s)}
          />
        ))}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Nenhum pedido por aqui"
          description={status ? "Nenhum pedido com esse status." : "Os pedidos da loja aparecem aqui."}
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Pedido</Th>
              <Th>Itens</Th>
              <Th>Status</Th>
              <Th className="text-right">Total</Th>
              <Th className="text-right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const s = ORDER_STATUS[order.status];
              return (
                <tr key={order.id} className="hover:bg-white/[0.02]">
                  <Td>
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-semibold text-white hover:text-brand-200"
                    >
                      #{order.number}
                    </Link>
                    <span className="block text-xs text-white/35">{formatDate(order.createdAt)}</span>
                  </Td>
                  <Td>
                    <span className="text-xs text-white/60">
                      {order.items.reduce((sum, i) => sum + i.quantity, 0)} itens
                    </span>
                    <span className="block text-xs text-white/35">
                      {order.customerPhone ? formatPhone(order.customerPhone) : "cliente pelo WhatsApp"}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </Td>
                  <Td className="text-right font-semibold text-white">{brl(order.totalCents)}</Td>
                  <Td>
                    <OrderRowActions
                      orderId={order.id}
                      orderNumber={order.number}
                      status={order.status}
                    />
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm transition",
        active
          ? "border-brand-400 bg-brand-500/15 font-semibold text-brand-200"
          : "border-white/10 text-white/60 hover:border-white/25",
      )}
    >
      {label}
      <span className="rounded-md bg-white/8 px-1.5 text-xs text-white/60">{count}</span>
    </Link>
  );
}
