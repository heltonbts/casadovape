import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, StatCard, TableWrap, Td, Th } from "@/components/admin/ui";
import { StockMovementForm } from "@/components/admin/stock-movement-form";
import { db } from "@/lib/db";
import { brl, formatDate } from "@/lib/utils";

export const metadata = { title: "Estoque" };

const MOVEMENT_LABEL = {
  IN: "Entrada",
  OUT: "Saída",
  ADJUST: "Ajuste",
  SALE: "Venda",
  RETURN: "Estorno",
  LOSS: "Perda",
} as const;

export default async function EstoquePage() {
  const [variants, movements] = await Promise.all([
    db.productVariant.findMany({
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      include: {
        product: { select: { id: true, name: true, priceCents: true, costCents: true, active: true } },
      },
    }),
    db.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        variant: { select: { name: true, product: { select: { name: true } } } },
        admin: { select: { name: true } },
      },
    }),
  ]);

  const totalUnits = variants.reduce((sum, v) => sum + v.stock, 0);
  const stockValue = variants.reduce(
    (sum, v) => sum + v.stock * (v.priceCents ?? v.product.priceCents),
    0,
  );
  const stockCost = variants.reduce((sum, v) => sum + v.stock * (v.product.costCents ?? 0), 0);
  const lowCount = variants.filter((v) => v.active && v.stock <= v.lowStockAlert).length;

  const options = variants.map((v) => ({
    id: v.id,
    label: `${v.product.name} — ${v.name}`,
    stock: v.stock,
  }));

  return (
    <>
      <PageHeader title="Estoque" description="Saldo por variante e histórico de movimentações." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Unidades em estoque" value={String(totalUnits)} />
        <StatCard label="Valor a preço de venda" value={brl(stockValue)} tone="accent" />
        <StatCard label="Custo do estoque" value={brl(stockCost)} hint="Só produtos com custo informado" />
        <StatCard
          label="Variantes em alerta"
          value={String(lowCount)}
          tone={lowCount > 0 ? "warning" : undefined}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_340px] xl:items-start">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-bold text-white">Saldo por variante</h2>
            {variants.length === 0 ? (
              <EmptyState title="Nenhuma variante cadastrada" />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Produto</Th>
                    <Th>Variante</Th>
                    <Th className="text-right">Estoque</Th>
                    <Th className="text-right">Alerta</Th>
                    <Th>Situação</Th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => {
                    const low = v.stock <= v.lowStockAlert;
                    return (
                      <tr key={v.id} className="hover:bg-white/[0.02]">
                        <Td>
                          <Link
                            href={`/admin/produtos/${v.product.id}`}
                            className="font-medium text-white hover:text-brand-200"
                          >
                            {v.product.name}
                          </Link>
                          {!v.product.active && (
                            <span className="ml-2 text-xs text-white/35">(oculto)</span>
                          )}
                        </Td>
                        <Td className="text-white/60">{v.name}</Td>
                        <Td className="text-right font-semibold text-white">{v.stock}</Td>
                        <Td className="text-right text-white/40">{v.lowStockAlert}</Td>
                        <Td>
                          {v.stock === 0 ? (
                            <Badge tone="danger">Esgotado</Badge>
                          ) : low ? (
                            <Badge tone="warning">Repor</Badge>
                          ) : (
                            <Badge tone="success">Ok</Badge>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-bold text-white">Últimas movimentações</h2>
            {movements.length === 0 ? (
              <EmptyState title="Nenhuma movimentação registrada" />
            ) : (
              <TableWrap>
                <thead>
                  <tr>
                    <Th>Quando</Th>
                    <Th>Item</Th>
                    <Th>Tipo</Th>
                    <Th className="text-right">Qtd.</Th>
                    <Th className="text-right">Saldo</Th>
                    <Th>Motivo</Th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <Td className="whitespace-nowrap text-xs text-white/45">
                        {formatDate(m.createdAt)}
                      </Td>
                      <Td>
                        <span className="block truncate text-white/85">{m.variant.product.name}</span>
                        <span className="text-xs text-white/35">{m.variant.name}</span>
                      </Td>
                      <Td className="text-white/60">{MOVEMENT_LABEL[m.type]}</Td>
                      <Td
                        className={`text-right font-semibold ${
                          m.quantity < 0 ? "text-red-300" : "text-emerald-300"
                        }`}
                      >
                        {m.quantity > 0 ? "+" : ""}
                        {m.quantity}
                      </Td>
                      <Td className="text-right text-white/80">{m.balance}</Td>
                      <Td className="text-xs text-white/40">
                        {m.reason ?? "—"}
                        {m.admin && <span className="block">por {m.admin.name}</span>}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </section>
        </div>

        <aside className="surface sticky top-6 p-5">
          <h2 className="mb-4 font-bold text-white">Movimentar estoque</h2>
          <StockMovementForm variants={options} />
        </aside>
      </div>
    </>
  );
}
