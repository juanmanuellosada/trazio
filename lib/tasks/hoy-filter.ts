import { dayBoundsUtc, todayInTimeZone } from "@/lib/dates/today";

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
