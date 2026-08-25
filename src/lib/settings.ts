import { cache } from "react";
import { db } from "@/lib/db";

const DEFAULTS = {
  id: "default",
  storeName: "Casa do Vape",
  whatsapp: "5588999275994",
};

/**
 * Configurações da loja (linha única). `cache` evita repetir a query nos
 * vários componentes de uma mesma renderização.
 */
export const getSettings = cache(async () => {
  const existing = await db.settings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return db.settings.create({ data: DEFAULTS });
});

export type Settings = Awaited<ReturnType<typeof getSettings>>;
