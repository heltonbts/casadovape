import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, TableWrap, Td, Th } from "@/components/admin/ui";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { db } from "@/lib/db";
import { brl } from "@/lib/utils";

export const metadata = { title: "Produtos" };

export default async function ProdutosAdminPage(props: PageProps<"/admin/produtos">) {
  const sp = await props.searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim();

  const products = await db.product.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { brand: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: {
      category: { select: { name: true } },
      brand: { select: { name: true } },
      variants: { select: { stock: true, lowStockAlert: true, active: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Produtos"
        description={`${products.length} ${products.length === 1 ? "produto" : "produtos"} no catálogo`}
        action={
          <ButtonLink href="/admin/produtos/novo">
            <Plus size={16} /> Novo produto
          </ButtonLink>
        }
      />

      <form className="mb-4" action="/admin/produtos">
        <input
          name="q"
          defaultValue={q}
          className="field max-w-sm"
          placeholder="Buscar por nome ou marca…"
          aria-label="Buscar produtos"
        />
      </form>

      {products.length === 0 ? (
        <EmptyState
          title={q ? "Nada encontrado" : "Catálogo vazio"}
          description={q ? "Tente outro termo de busca." : "Cadastre o primeiro produto da loja."}
          action={
            <ButtonLink href="/admin/produtos/novo" className="mt-2">
              <Plus size={16} /> Novo produto
            </ButtonLink>
          }
        />
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <Th>Produto</Th>
              <Th>Categoria</Th>
              <Th className="text-right">Preço</Th>
              <Th className="text-right">Estoque</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
              const low = product.variants.some((v) => v.active && v.stock <= v.lowStockAlert);
              return (
                <tr key={product.id} className="hover:bg-white/[0.02]">
                  <Td>
                    <Link
                      href={`/admin/produtos/${product.id}`}
                      className="font-medium text-white hover:text-brand-200"
                    >
                      {product.name}
                    </Link>
                    <span className="block text-xs text-white/35">
                      {product.brand?.name ?? "sem marca"} · {product.variants.length} variantes
                    </span>
                  </Td>
                  <Td className="text-white/55">{product.category?.name ?? "—"}</Td>
                  <Td className="text-right">{brl(product.priceCents)}</Td>
                  <Td className="text-right">
                    <span className={low ? "font-semibold text-amber-300" : "text-white/80"}>
                      {stock}
                    </span>
                  </Td>
                  <Td>
                    {product.active ? (
                      product.featured ? (
                        <Badge tone="brand">Destaque</Badge>
                      ) : (
                        <Badge tone="success">Ativo</Badge>
                      )
                    ) : (
                      <Badge tone="neutral">Oculto</Badge>
                    )}
                  </Td>
                  <Td className="text-right">
                    <ProductRowActions
                      id={product.id}
                      slug={product.slug}
                      name={product.name}
                      active={product.active}
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
