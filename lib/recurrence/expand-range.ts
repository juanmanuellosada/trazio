import { RRule } from "rrule";
import { compareDates, type CalendarDate } from "@/lib/parser/dates";

/**
 * Igual que `toUTCDate`/`fromUTCDate` de `lib/parser/dates.ts` (no
 * exportadas ahí) y de `next.ts`: aritmética de calendario en UTC, nunca con
 * getters locales.
 */
function toUTCDate(cd: CalendarDate): Date {
  return new Date(Date.UTC(cd.y, cd.m - 1, cd.d));
}

function fromUTCDate(date: Date): CalendarDate {
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

function parseCalendarDate(dateStr: string): CalendarDate {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

/** El día calendario (UTC) que corresponde a un instante ISO — suficiente para acotar por `recurrence_ends_at` en una vista previa, sin necesitar la zona horaria del usuario (a diferencia de `planNextOccurrence`, que sí la usa para decidir si una serie ya terminó). */
function calendarDateOfInstant(instant: string): CalendarDate {
  return fromUTCDate(new Date(instant));
}

export type RecurringTaskForExpansion = {
  recurrence_rule: string | null;
  due_date: string | null;
  due_at: string | null;
  recurrence_ends_at: string | null;
  recurrence_count: number | null;
};

/**
 * Ocurrencias futuras de una tarea recurrente dentro de un rango visible
 * (tarea 5.7, bloques de vista previa): estrictamente posteriores a la
 * ocurrencia actual de la tarea, con `dtstart` anclado en su propia fecha de
 * vencimiento — a diferencia de `nextOccurrence`/`planNextOccurrence`
 * (`next.ts`/`series.ts`), acá no hace falta `deriveAnchor`: la fecha
 * actual de la tarea ya está bien posicionada por construcción (nació de
 * una ocurrencia válida de la regla), así que anclar `dtstart` ahí alcanza
 * para que `BYDAY`/etc. sigan cayendo donde corresponde.
 *
 * `recurrence_count` es el mismo contador regresivo que interpreta
 * `planNextOccurrence`: cuántas ocurrencias más puede generar la serie,
 * contando la próxima. Una vista previa no consume el contador (no
 * completa nada), solo lo respeta como techo.
 */
export function expandRecurringTaskRange(
  task: RecurringTaskForExpansion,
  rangeStart: CalendarDate,
  rangeEnd: CalendarDate,
): CalendarDate[] {
  if (!task.recurrence_rule) return [];

  const currentDate = task.due_date
    ? parseCalendarDate(task.due_date)
    : task.due_at
      ? calendarDateOfInstant(task.due_at)
      : null;
  if (!currentDate) return [];

  const effectiveRangeEnd =
    task.recurrence_ends_at && compareDates(calendarDateOfInstant(task.recurrence_ends_at), rangeEnd) < 0
      ? calendarDateOfInstant(task.recurrence_ends_at)
      : rangeEnd;
  if (compareDates(effectiveRangeEnd, rangeStart) < 0) return [];

  const dtstart = toUTCDate(currentDate);
  const rule = new RRule({ ...RRule.parseString(task.recurrence_rule), dtstart });
  const occurrences = rule.between(toUTCDate(rangeStart), toUTCDate(effectiveRangeEnd), true);
  const future = occurrences.filter((date) => date.getTime() > dtstart.getTime()).map(fromUTCDate);

  return task.recurrence_count !== null ? future.slice(0, task.recurrence_count) : future;
}
