import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-white/45">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "brand" | "accent" | "warning";
}) {
  return (
    <div className="surface p-5">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-black",
          tone === "accent" && "text-accent-300",
          tone === "warning" && "text-amber-300",
          !tone && "text-white",
          tone === "brand" && "text-brand-200",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface grid place-items-center gap-2 p-12 text-center">
      <p className="font-semibold text-white">{title}</p>
      {description && <p className="max-w-sm text-sm text-white/45">{description}</p>}
      {action}
    </div>
  );
}

/** Tabela com rolagem horizontal no mobile — usada em todas as listagens. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "border-b border-white/8 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/40",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-white/5 px-4 py-3 text-white/80", className)}>{children}</td>;
}

export function LinkCell({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-medium text-white hover:text-brand-200">
      {children}
    </Link>
  );
}
