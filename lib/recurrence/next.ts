import { RRule } from "rrule";
import type { CalendarDate } from "@/lib/parser/dates";
import { deriveAnchor } from "./anchor";

/**
 * Igual que `toUTCDate`/`fromUTCDate` de `lib/parser/dates.ts` (no
 * exportadas ahí): todo el cálculo de la regla ocurre en aritmética de
 * calendario UTC, nunca con getters locales, por la misma razón que ese
 * módulo ya documenta — un `Date` construido con getters locales cambia de
 * valor según el huso del proceso que corre el test.
 */
function toUTCDate(cd: CalendarDate): Date {
  return new Date(Date.UTC(cd.y, cd.m - 1, cd.d));
}

function fromUTCDate(date: Date): CalendarDate {
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

export type NextOccurrenceParams = {
  rrule: string;
  /** Fecha de vencimiento original de la tarea completada, o `null` si no tenía. */
  dueDate: CalendarDate | null;
  /** Hoy, el día en que se completa — viaja explícito, nunca `new Date()` acá. */
  now: CalendarDate;
};

/**
 * Próxima ocurrencia de una regla RRULE (bloque 5.2, D-D/D-E). El ancla
 * (`deriveAnchor`) fija la fase del cálculo — vencimiento original para
 * reglas de calendario, `now` (que en la práctica es la fecha de completado)
 * para intervalo puro — pero la ocurrencia que se agenda es siempre la
 * primera **estrictamente posterior a hoy**, nunca la inmediatamente
 * siguiente al ancla: así una recurrente vencida no acumula las ocurrencias
 * perdidas (D-E), sin importar cuánto tiempo lleve vencida.
 */
export function nextOccurrence({ rrule, dueDate, now }: NextOccurrenceParams): CalendarDate {
  const anchor = deriveAnchor(rrule);
  const dtstart = toUTCDate(anchor === "due" ? (dueDate ?? now) : now);
  const rule = new RRule({ ...RRule.parseString(rrule), dtstart });
  const next = rule.after(toUTCDate(now), false);
  return fromUTCDate(next ?? dtstart);
}
