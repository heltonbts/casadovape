"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ExternalLink,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Tags,
  Ticket,
  X,
  Zap,
} from "lucide-react";
import { logoutAction } from "@/app/actions/admin/auth";
import type { AdminSession } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/estoque", label: "Estoque", icon: Boxes },
  { href: "/admin/categorias", label: "Categorias e marcas", icon: Tags },
  { href: "/admin/cupons", label: "Cupons", icon: Ticket },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/config", label: "Configurações", icon: Settings },
];

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              active
                ? "bg-brand-500/15 font-semibold text-brand-200"
                : "text-white/55 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon size={17} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* --------------------------------------------------- sidebar (lg+) */}
      <aside className="fixed inset-y-0 hidden w-64 flex-col border-r border-white/8 bg-ink-900/80 p-4 backdrop-blur-xl lg:flex">
        <Link href="/admin" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500">
            <Zap size={17} className="text-white" fill="currentColor" />
          </span>
          <span className="font-black text-white">Painel</span>
        </Link>

        {nav}

        <div className="mt-auto space-y-1 border-t border-white/8 pt-4">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/55 hover:bg-white/5 hover:text-white"
          >
            <ExternalLink size={17} /> Ver a loja
          </Link>
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-white">{session.name}</p>
            <p className="truncate text-xs text-white/40">{session.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/55 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={17} /> Sair
            </button>
          </form>
        </div>
      </aside>

      {/* ------------------------------------------------------------ mobile */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/8 bg-ink-950/85 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu do painel"
            className="grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/5"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
          <span className="font-bold text-white">Painel</span>
        </header>

        {open && (
          <div className="border-b border-white/8 bg-ink-900 p-4 lg:hidden">
            {nav}
            <form action={logoutAction} className="mt-2 border-t border-white/8 pt-2">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/55"
              >
                <LogOut size={17} /> Sair
              </button>
            </form>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
