/**
 * Regras do combo em um lugar só, sem tocar no banco — assim a vitrine, o
 * checkout e o painel respondem a mesma coisa sobre "quantos dá para vender".
 */

export type ComboItemStock = {
  quantity: number;
  variant: { stock: number };
};

/**
 * Quantos combos dá para montar com o estoque de hoje: o item mais escasso
 * manda. Combo sem itens não é vendável — é um cadastro pela metade, e deixá-lo
 * com estoque "infinito" venderia o que não existe.
 */
export function comboStock(items: ComboItemStock[]) {
  if (items.length === 0) return 0;
  return items.reduce((min, item) => {
    const perCombo = Math.max(1, item.quantity);
    return Math.min(min, Math.floor(item.variant.stock / perCombo));
  }, Number.POSITIVE_INFINITY);
}

/** Soma do preço dos itens comprados avulsos — a base do "você economiza". */
export function comboLooseTotal(
  items: { quantity: number; variant: { priceCents: number | null; product: { priceCents: number } } }[],
) {
  return items.reduce(
    (sum, item) =>
      sum + (item.variant.priceCents ?? item.variant.product.priceCents) * Math.max(1, item.quantity),
    0,
  );
}
