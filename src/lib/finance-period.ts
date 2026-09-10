import { STORE_UTC_OFFSET, storeDayEnd, storeDayStart, toDateInput } from "@/lib/utils";

export const PERIODS = ["hoje", "semana", "mes", "personalizado"] as const;
export type PeriodKey = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  hoje: "Hoje",
  semana: "Semana",
  mes: "Mês",
  personalizado: "Personalizado",
};

export type Period = {
  key: PeriodKey;
  /** "2026-09-10" no fuso da loja — o que o <input type="date"> usa. */
  from: string;
  to: string;
  /** Instantes reais para filtrar no banco (`to` é exclusivo). */
  start: Date;
  end: Date;
  days: number;
};

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Dia da semana (0 = domingo) de um dia da loja, sem depender do fuso do servidor. */
function weekdayOf(day: string) {
  return new Date(`${day}T12:00:00${STORE_UTC_OFFSET}`).getUTCDay();
}

function addDays(day: string, delta: number) {
  const d = storeDayStart(day);
  d.setUTCDate(d.getUTCDate() + delta);
  return toDateInput(d);
}

/**
 * Traduz os parâmetros da URL em um intervalo fechado de dias da loja.
 * Qualquer coisa inválida cai em "hoje", então a página nunca quebra com um
 * link estranho colado na barra de endereços.
 */
export function resolvePeriod(params: {
  periodo?: string;
  de?: string;
  ate?: string;
  now?: Date;
}): Period {
  const today = toDateInput(params.now ?? new Date());
  const key = (PERIODS as readonly string[]).includes(params.periodo ?? "")
    ? (params.periodo as PeriodKey)
    : "hoje";

  let from = today;
  let to = today;

  if (key === "semana") {
    // Semana comercial: segunda até hoje.
    from = addDays(today, -((weekdayOf(today) + 6) % 7));
  } else if (key === "mes") {
    from = `${today.slice(0, 7)}-01`;
  } else if (key === "personalizado") {
    from = DAY_RE.test(params.de ?? "") ? params.de! : today;
    to = DAY_RE.test(params.ate ?? "") ? params.ate! : today;
    if (from > to) [from, to] = [to, from];
  }

  const start = storeDayStart(from);
  const end = storeDayEnd(to);

  return {
    key,
    from,
    to,
    start,
    end,
    days: Math.round((end.getTime() - start.getTime()) / 86_400_000),
  };
}

/** O período de mesmo tamanho imediatamente anterior — base da comparação. */
export function previousPeriod(period: Period) {
  const from = addDays(period.from, -period.days);
  const to = addDays(period.from, -1);
  return { from, to, start: storeDayStart(from), end: storeDayEnd(to) };
}
