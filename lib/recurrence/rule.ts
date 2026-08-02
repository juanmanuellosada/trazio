import { dayOfWeek, type CalendarDate } from "@/lib/parser/dates";

/**
 * Regla de recurrencia completa, en RRULE (`repeticion-configurable`, D-B):
 * a diferencia de la versión anterior de `recurrence-editor.tsx` (que solo
 * leía/escribía `FREQ`/`INTERVAL`), estas funciones parsean y arman también
 * `BYDAY`/`BYMONTHDAY`/`BYMONTH` — los componentes que hoy solo produce el
 * parser de lenguaje natural (`lib/parser/recognizers.ts`) — para que
 * editar una regla que ya los traía no se los borre en silencio (el bug
 * que el propio comentario de `recurrence-editor.tsx` admitía).
 */
export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: "día",
  WEEKLY: "semana",
  MONTHLY: "mes",
  YEARLY: "año",
};
export const FREQUENCY_OPTIONS = Object.keys(FREQUENCY_LABELS) as Frequency[];

/** Índice 0 (domingo) a 6 (sábado), igual que `dayOfWeek`/`Date.getUTCDay`. */
const WEEKDAY_RRULE = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
// Orden canónico de BYDAY (RFC 5545, arranca en lunes), igual que
// `lib/parser/recognizers.ts`: dos formulaciones equivalentes tienen que
// dar la misma regla, sin importar en qué orden se marcaron los días.
const BYDAY_CANONICAL_ORDER = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** Para el multiselect de días del diálogo personalizado (mismo patrón que `DAY_OPTIONS` de `habit-form-dialog.tsx`). */
export const WEEKDAY_OPTIONS: { code: string; short: string; full: string }[] = [
  { code: "MO", short: "Lu", full: "Lunes" },
  { code: "TU", short: "Ma", full: "Martes" },
  { code: "WE", short: "Mi", full: "Miércoles" },
  { code: "TH", short: "Ju", full: "Jueves" },
  { code: "FR", short: "Vi", full: "Viernes" },
  { code: "SA", short: "Sá", full: "Sábado" },
  { code: "SU", short: "Do", full: "Domingo" },
];

export type RuleComponents = {
  frequency: Frequency;
  interval: number;
  /** Códigos RRULE (`MO`, `TU`, …), vacío si la regla no nombra días. */
  byDay: string[];
  byMonthDay: number | null;
  byMonth: number | null;
};

export function parseRule(rule: string): RuleComponents {
  const freqMatch = /FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/.exec(rule);
  const intervalMatch = /INTERVAL=(\d+)/.exec(rule);
  const byDayMatch = /BYDAY=([A-Z,]+)/.exec(rule);
  const byMonthDayMatch = /BYMONTHDAY=(\d+)/.exec(rule);
  const byMonthMatch = /BYMONTH=(\d+)/.exec(rule);
  return {
    frequency: (freqMatch?.[1] as Frequency | undefined) ?? "WEEKLY",
    interval: intervalMatch ? Number(intervalMatch[1]) : 1,
    byDay: byDayMatch ? byDayMatch[1].split(",") : [],
    byMonthDay: byMonthDayMatch ? Number(byMonthDayMatch[1]) : null,
    byMonth: byMonthMatch ? Number(byMonthMatch[1]) : null,
  };
}

function canonicalByDay(days: string[]): string {
  const set = new Set(days);
  return BYDAY_CANONICAL_ORDER.filter((code) => set.has(code)).join(",");
}

/**
 * Arma la regla completa a partir de sus componentes (D-B): quien llama
 * decide qué preservar y qué reemplazar — pasar el `byDay`/`byMonthDay`/
 * `byMonth` ya existentes cuando solo cambia otra cosa es lo que evita el
 * borrado en silencio.
 */
export function buildRule(components: RuleComponents): string {
  const parts = [`FREQ=${components.frequency}`];
  if (components.interval > 1) parts.push(`INTERVAL=${components.interval}`);
  if (components.byDay.length > 0) parts.push(`BYDAY=${canonicalByDay(components.byDay)}`);
  if (components.byMonthDay !== null) parts.push(`BYMONTHDAY=${components.byMonthDay}`);
  if (components.byMonth !== null) parts.push(`BYMONTH=${components.byMonth}`);
  return parts.join(";");
}

export type QuickOption = { id: string; label: string; rule: string };

/**
 * Opciones rápidas derivadas de la fecha de la tarea (D-C, tarea 3.2):
 * textos y reglas que dependen de esa fecha, no genéricos. Sin fecha no hay
 * de dónde derivarlas — quien llama (`RecurrenceEditor`) directamente no
 * invoca esta función en ese caso.
 */
export function quickOptionsFor(dueDate: CalendarDate): QuickOption[] {
  const dow = dayOfWeek(dueDate);
  return [
    {
      id: "daily",
      label: "Cada día",
      rule: buildRule({ frequency: "DAILY", interval: 1, byDay: [], byMonthDay: null, byMonth: null }),
    },
    {
      id: "weekly",
      label: `Cada semana el ${WEEKDAY_NAMES[dow]}`,
      rule: buildRule({ frequency: "WEEKLY", interval: 1, byDay: [WEEKDAY_RRULE[dow]!], byMonthDay: null, byMonth: null }),
    },
    {
      id: "workday",
      label: "Cada día laborable",
      rule: buildRule({
        frequency: "WEEKLY",
        interval: 1,
        byDay: ["MO", "TU", "WE", "TH", "FR"],
        byMonthDay: null,
        byMonth: null,
      }),
    },
    {
      id: "monthly",
      label: `Cada mes el ${dueDate.d}`,
      rule: buildRule({ frequency: "MONTHLY", interval: 1, byDay: [], byMonthDay: dueDate.d, byMonth: null }),
    },
    {
      id: "yearly",
      label: `Cada año el ${dueDate.d} de ${MONTH_NAMES[dueDate.m - 1]}`,
      rule: buildRule({ frequency: "YEARLY", interval: 1, byDay: [], byMonthDay: dueDate.d, byMonth: dueDate.m }),
    },
  ];
}
