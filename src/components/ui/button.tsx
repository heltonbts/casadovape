import Link from "next/link";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60 " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary:
    "bg-gradient-to-r from-brand-500 to-brand-400 text-white shadow-lg shadow-brand-600/25 hover:brightness-110",
  accent: "bg-accent-400 text-ink-950 hover:bg-accent-300",
  outline: "border border-white/15 text-white hover:border-brand-400 hover:bg-white/5",
  ghost: "text-white/70 hover:bg-white/5 hover:text-white",
  danger: "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  whatsapp: "bg-[#25D366] text-[#04310f] shadow-lg shadow-[#25D366]/20 hover:brightness-110",
} as const;

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
} as const;

export type ButtonVariant = keyof typeof variants;

type CommonProps = {
  variant?: ButtonVariant;
  size?: keyof typeof sizes;
  className?: string;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: CommonProps & React.ComponentProps<typeof Link>) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
