import { permanentRedirect, redirect } from "next/navigation";
import { db } from "@/lib/db";

/**
 * A aba de destaques virou uma lista comum quando o painel ganhou listas
 * personalizadas. A rota antiga fica de pé só para não quebrar link salvo:
 * manda para a lista "destaques" se ela existir, senão para o catálogo.
 */
export default async function DestaquesPage() {
  const destaques = await db.collection.findFirst({
    where: { slug: "destaques", active: true },
    select: { slug: true },
  });
  if (!destaques) redirect("/produtos");
  permanentRedirect(`/lista/${destaques.slug}`);
}
