import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata centavos como moeda brasileira. 8990 => "R$ 89,90" */
export function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Converte "89,90" ou "89.90" (input do admin) em centavos. */
export function toCents(input: string | number) {
  if (typeof input === "number") return Math.round(input * 100);
  const normalized = input.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** Centavos => "89,90", para preencher inputs do admin. */
export function fromCents(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Mantém só os dígitos — usado em telefone, CEP e link de WhatsApp. */
export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function formatPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function formatZip(value: string) {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/**
 * A loja fica em Aracati/CE: UTC-3 o ano inteiro (o Brasil não tem mais horário
 * de verão). O servidor roda em UTC, então toda data mostrada ou comparada
 * precisa passar por aqui — senão o painel mostra o pedido três horas à frente.
 */
export const STORE_TIME_ZONE = "America/Fortaleza";
export const STORE_UTC_OFFSET = "-03:00";

export function formatDate(date: Date) {
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: STORE_TIME_ZONE,
  });
}

/** Só o dia, no fuso da loja. */
export function formatDay(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: STORE_TIME_ZONE });
}

/** "2026-08-28" no fuso da loja — formato que o <input type="date"> espera. */
export function toDateInput(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: STORE_TIME_ZONE });
}

/** Meia-noite de hoje em Aracati, como instante real (para filtrar no banco). */
export function startOfStoreToday(now: Date = new Date()) {
  const offsetMs = 3 * 60 * 60 * 1000;
  const local = new Date(now.getTime() - offsetMs);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + offsetMs);
}

/**
 * Monta o link do WhatsApp. `phone` aceita qualquer formatação; assume DDI 55
 * quando o número vem só com DDD + número.
 */
export function whatsappLink(phone: string, message: string) {
  let digits = onlyDigits(phone);
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
