import { RRule } from "rrule";
import type { CalendarDate } from "@/lib/parser/dates";
import { resolveAnchor, type RecurrenceAnchor } from "./anchor";

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
  /** `tasks.recurrence_anchor` (`repeticion-configurable`, D-A): vacía si nunca se eligió, y entonces se deduce como siempre. */
  anchor?: RecurrenceAnchor | null;
};

/**
 * Próxima ocurrencia de una regla RRULE (bloque 5.2, D-D/D-E; ancla
 * elegible desde `repeticion-configurable` D-A). `resolveAnchor` fija la
 * fase del cálculo — el valor explícito de la tarea si lo eligió, si no
 * vencimiento original para reglas de calendario o `now` (en la práctica la
 * fecha de completado) para intervalo puro — pero la ocurrencia que se
 * agenda es siempre la primera **estrictamente posterior al mayor entre hoy
 * y el vencimiento** (nunca solo posterior a hoy): así una recurrente
 * vencida no acumula las ocurrencias perdidas (D-E), sin importar cuánto
 * tiempo lleve vencida, y una recurrente que se completa **antes** de
 * vencer no se queda pegada a su propia fecha de vencimiento, que también
 * sería "la primera posterior a hoy". Para ancla `"completion"` el corte
 * sigue siendo `now`: no hay vencimiento del que protegerse.
 */
export function nextOccurrence({ rrule, dueDate, now, anchor }: NextOccurrenceParams): CalendarDate {
  const resolvedAnchor = resolveAnchor(anchor, rrule);
  const anchorDate = resolvedAnchor === "due" ? (dueDate ?? now) : now;
  const dtstart = toUTCDate(anchorDate);
  const rule = new RRule({ ...RRule.parseString(rrule), dtstart });
  const cutoff = resolvedAnchor === "due" && toUTCDate(anchorDate) > toUTCDate(now) ? anchorDate : now;
  const next = rule.after(toUTCDate(cutoff), false);
  return fromUTCDate(next ?? dtstart);
}
