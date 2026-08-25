import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = { title: { default: "Painel", template: "%s · Painel" } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Protege todas as páginas do painel. As Server Actions revalidam a sessão
  // por conta própria, já que podem ser chamadas por POST direto.
  const session = await requireAdmin();
  return <AdminShell session={session}>{children}</AdminShell>;
}
