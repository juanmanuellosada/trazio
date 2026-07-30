import { addDays } from "date-fns";
import { dayBoundsUtc, taskDueDay, todayInTimeZone, type TaskDueFields } from "@/lib/dates/today";

/**
 * Ventana de la vista Próximos (D-J del design de fase 2): configurable de
 * una semana a tres meses, con 7 días de default. El control de la barra de
 * opciones que la cambia lo monta el grupo 6 — acá solo queda listo el
 * parámetro y sus límites, para que ese control tenga contra qué validar.
 */
export const UPCOMING_WINDOW_MIN_DAYS = 7;
export const UPCOMING_WINDOW_MAX_DAYS = 90;
export const UPCOMING_WINDOW_DEFAULT_DAYS = 7;

export function clampWindowDays(days: number): number {
  return Math.min(UPCOMING_WINDOW_MAX_DAYS, Math.max(UPCOMING_WINDOW_MIN_DAYS, Math.trunc(days)));
}

/**
 * Último día de la ventana (incluido), como día calendario en la zona del
 * usuario: `windowDays` cuenta hoy como el primer día, así que el último es
 * hoy + (windowDays - 1). Se calcula sumando días al instante `now` (no al
 * string de fecha) para que `dayBoundsUtc`/`todayInTimeZone`, que esperan un
 * `Date`, crucen mes o año sin aritmética manual de calendario.
 */
function windowEndInstant(now: Date, windowDays: number): Date {
  return addDays(now, clampWindowDays(windowDays) - 1);
}

/**
 * Filtro PostgREST de candidatas a Próximos: todas las atrasadas (sin cota
 * inferior, cualquiera sea su antigüedad) más las que vencen dentro de la
 * ventana. A diferencia de `hoyCandidatesFilter`, acá no hace falta traer
 * completadas — Próximos no las muestra (fuera de alcance de este bloque; el
 * control "mostrar completadas" lo monta el grupo 6).
 */
export function upcomingCandidatesFilter(now: Date, timezone: string, windowDays: number): string {
  const windowEnd = windowEndInstant(now, windowDays);
  const endDay = todayInTimeZone(windowEnd, timezone);
  const { endUtc } = dayBoundsUtc(windowEnd, timezone);
  return `due_date.lte.${endDay},due_at.lte.${endUtc}`;
}

type UpcomingTask = TaskDueFields & { priority: number };

/**
 * Orden por defecto de Próximos (`specs/opciones-de-vista`, D25): fecha de
 * vencimiento ascendente primero — a diferencia de `compareHoyTasks`, acá
 * las candidatas cruzan varios días futuros, así que comparar solo por
 * "tiene hora o no" sin mirar el día antes ordenaría mal una tarea de
 * mañana con hora contra una de pasado mañana sin hora. Con el día ya
 * resuelto, dentro de un mismo día desempata por hora (con hora antes que
 * sin hora, ascendente), y a igualdad de fecha y hora por prioridad
 * descendente.
 */
export function compareUpcomingTasks(a: UpcomingTask, b: UpcomingTask, timezone: string): number {
  const dayA = taskDueDay(a, timezone) ?? "";
  const dayB = taskDueDay(b, timezone) ?? "";
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;

  if (a.due_at && b.due_at) {
    const diff = new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    if (diff !== 0) return diff;
  } else if (a.due_at && !b.due_at) {
    return -1;
  } else if (!a.due_at && b.due_at) {
    return 1;
  }

  // Prioridad descendente (la más urgente primero): `1` es "Urgente" y `4`
  // es "Baja" (`lib/validation/tasks.ts`), así que "descendente" en
  // severidad es ascendente en el número guardado.
  return a.priority - b.priority;
}
