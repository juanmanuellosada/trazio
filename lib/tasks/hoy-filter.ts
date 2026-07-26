import { dayBoundsUtc, todayInTimeZone, type TaskDueFields } from "@/lib/dates/today";

/**
 * Filtro PostgREST compartido por la lectura de servidor y la del cliente
 * de la vista Hoy (bloque 8.2): candidatas a alguno de sus tres bloques —
 * pendientes atrasadas o que vencen hoy, más las completadas hoy (para el
 * bloque opcional de completadas, sin otro viaje a la base). El bucketing
 * fino (atrasada vs. hoy) se hace en memoria con `lib/dates/today.ts`, que
 * es lo único que sabe distinguir día calendario de instante — acá solo se
 * acota qué candidatas trae la consulta.
 */
export function hoyCandidatesFilter(now: Date, timezone: string): string {
  const today = todayInTimeZone(now, timezone);
  const { startUtc, endUtc } = dayBoundsUtc(now, timezone);
  return `and(completed_at.is.null,or(due_date.lte.${today},due_at.lte.${endUtc})),and(completed_at.gte.${startUtc},completed_at.lte.${endUtc})`;
}

/**
 * Orden de la vista Hoy (D25): a diferencia de Bandeja y Proyecto,
 * `position` no sirve acá porque las candidatas cruzan proyectos distintos
 * y solo es comparable entre hermanos de un mismo proyecto. En su lugar:
 * primero las tareas con hora (`due_at`) en orden cronológico ascendente,
 * después las de todo el día (`due_date` sin hora), también ascendente por
 * fecha. Ascendente en los dos grupos deja, dentro del bloque de atrasadas,
 * la más vencida primero. No hace falta convertir a la zona horaria del
 * usuario: comparar dos instantes (`due_at`) o dos días calendario
 * (`due_date`, ya en el formato `yyyy-MM-dd` que ordena igual como texto
 * que como fecha) no depende de la zona — la zona solo importa para decidir
 * a qué bloque pertenece cada tarea, que resuelve `lib/dates/today.ts`.
 */
export function compareHoyTasks(a: TaskDueFields, b: TaskDueFields): number {
  if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  if (a.due_at) return -1;
  if (b.due_at) return 1;
  const aDate = a.due_date ?? "";
  const bDate = b.due_date ?? "";
  return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
}
