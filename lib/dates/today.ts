import { formatInTimeZone } from "date-fns-tz";

export type TaskDueFields = { due_date: string | null; due_at: string | null };
export type TaskCompletionFields = { completed_at: string | null };

/**
 * "Hoy" es el día calendario (`yyyy-MM-dd`) de `now` en la zona horaria del
 * usuario (`user_preferences.timezone`, IANA) — nunca la del servidor ni
 * UTC. Todo lo demás de este módulo recibe `now` como parámetro en vez de
 * leer el reloj: es el mismo principio que E1 del parser (`ahora` viaja
 * explícito), necesario para que los tests sean deterministas.
 */
export function todayInTimeZone(now: Date, timezone: string): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

/**
 * Instantes UTC de inicio y fin del día de hoy en la zona del usuario, para
 * acotar consultas sobre columnas `timestamptz` (`due_at`, `completed_at`).
 * El token `XXX` de `date-fns-tz` imprime el offset real de esa zona en ese
 * momento (con horario de verano si corresponde); `new Date(...)` interpreta
 * esa hora local con su offset sin ninguna aritmética manual de husos.
 */
export function dayBoundsUtc(now: Date, timezone: string): { startUtc: string; endUtc: string } {
  const startUtc = new Date(formatInTimeZone(now, timezone, "yyyy-MM-dd'T'00:00:00.000XXX")).toISOString();
  const endUtc = new Date(formatInTimeZone(now, timezone, "yyyy-MM-dd'T'23:59:59.999XXX")).toISOString();
  return { startUtc, endUtc };
}

/**
 * Día calendario de vencimiento de una tarea, en la zona del usuario.
 * `due_date` ya es un día calendario (`date` de Postgres, sin hora): se usa
 * tal cual. `due_at` es un instante (`timestamptz`): hay que proyectarlo a
 * la zona del usuario antes de leer a qué día pertenece — mezclar los dos
 * sin esta distinción es "la fuente número uno de bugs de 'se me movió un
 * día'" (`.claude/rules/database.md`).
 */
export function taskDueDay(task: TaskDueFields, timezone: string): string | null {
  if (task.due_date) return task.due_date;
  if (task.due_at) return formatInTimeZone(task.due_at, timezone, "yyyy-MM-dd");
  return null;
}

/**
 * Atrasada (design de fase 1, E5): vencida antes de hoy y todavía sin
 * completar. Sin rollover — una hora ya pasada hoy no se corre a mañana,
 * queda atrasada y visible acá.
 */
export function isTaskOverdue(
  task: TaskDueFields & TaskCompletionFields,
  timezone: string,
  now: Date = new Date(),
): boolean {
  if (task.completed_at) return false;
  const due = taskDueDay(task, timezone);
  if (!due) return false;
  return due < todayInTimeZone(now, timezone);
}

/** Vence hoy: mismo día calendario que "ahora" en la zona del usuario, sin importar si ya se completó. */
export function isTaskDueToday(task: TaskDueFields, timezone: string, now: Date = new Date()): boolean {
  const due = taskDueDay(task, timezone);
  if (!due) return false;
  return due === todayInTimeZone(now, timezone);
}

/** Completada hoy: `completed_at` cae dentro del día calendario de hoy en la zona del usuario. */
export function isTaskCompletedToday(task: TaskCompletionFields, timezone: string, now: Date = new Date()): boolean {
  if (!task.completed_at) return false;
  return formatInTimeZone(task.completed_at, timezone, "yyyy-MM-dd") === todayInTimeZone(now, timezone);
}
