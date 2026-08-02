import { formatInTimeZone } from "date-fns-tz";
import { formatDate, toDueAt, type CalendarDate } from "@/lib/parser/dates";
import type { RecurrenceAnchor } from "./anchor";
import { nextOccurrence } from "./next";

export type RecurringTaskFields = {
  recurrence_rule: string;
  recurrence_ends_at: string | null;
  recurrence_count: number | null;
  due_date: string | null;
  due_at: string | null;
  /** `tasks.recurrence_anchor` (`repeticion-configurable`, D-A): `null` si nunca se eligió. */
  recurrence_anchor: RecurrenceAnchor | null;
};

export type NextInstancePlan = {
  due_date: string | null;
  due_at: string | null;
  recurrence_count: number | null;
};

function parseCalendarDate(dateStr: string): CalendarDate {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function calendarDateOf(instant: string, timezone: string): CalendarDate {
  return parseCalendarDate(formatInTimeZone(instant, timezone, "yyyy-MM-dd"));
}

function timeOf(instant: string, timezone: string): { hour: number; minute: number } {
  const [hour, minute] = formatInTimeZone(instant, timezone, "HH:mm").split(":").map(Number);
  return { hour, minute };
}

/**
 * Decide si completar una tarea recurrente genera la siguiente instancia, y
 * con qué fecha (bloque 5.3/5.4, D-E, requirement "Fin de la serie
 * recurrente"). `recurrence_count` se interpreta como un contador
 * regresivo: cuántas ocurrencias más, contando la que se está por crear
 * ahora, todavía puede generar la serie — `null` es sin límite, `0` es
 * agotada. Devuelve `null` si la serie ya terminó (por fecha tope vencida o
 * cantidad agotada) y no hay que crear nada.
 *
 * `now` es el instante real (para comparar contra `recurrence_ends_at`) y
 * `today` el día calendario en la zona horaria del usuario (para el cálculo
 * de la regla, D-D/D-E). Si la tarea completada no tenía hora (`due_date`),
 * la siguiente tampoco la tiene; si tenía `due_at`, la siguiente conserva la
 * misma hora del día.
 */
export function planNextOccurrence(
  task: RecurringTaskFields,
  now: Date,
  today: CalendarDate,
  timezone: string,
): NextInstancePlan | null {
  if (task.recurrence_ends_at && new Date(task.recurrence_ends_at).getTime() <= now.getTime()) return null;
  if (task.recurrence_count !== null && task.recurrence_count <= 0) return null;

  const dueDate = task.due_date
    ? parseCalendarDate(task.due_date)
    : task.due_at
      ? calendarDateOf(task.due_at, timezone)
      : null;

  const next = nextOccurrence({ rrule: task.recurrence_rule, dueDate, now: today, anchor: task.recurrence_anchor });
  const recurrenceCount = task.recurrence_count !== null ? task.recurrence_count - 1 : null;

  if (task.due_at) {
    const { hour, minute } = timeOf(task.due_at, timezone);
    return { due_date: null, due_at: toDueAt(next, hour, minute, timezone), recurrence_count: recurrenceCount };
  }
  return { due_date: formatDate(next), due_at: null, recurrence_count: recurrenceCount };
}
