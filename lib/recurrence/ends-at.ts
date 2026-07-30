import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * `recurrence_ends_at` es `timestamptz` (a diferencia de `due_date`/`deadline`,
 * que son `date` puro sin zona): `lib/recurrence/series.ts` lo compara contra
 * un instante real (`recurrence_ends_at <= now`), así que el día que el
 * editor deja elegir (sin hora) tiene que anclarse al final de ese día en la
 * zona horaria del usuario antes de guardarlo — si no, Postgres lo interpreta
 * como medianoche en la zona del servidor y la serie puede cortarse un día
 * antes de lo que el usuario esperaba. Mismo criterio que `toDueAt` aplica
 * para `due_at` (`lib/parser/dates.ts`).
 */
export function recurrenceEndsAtOf(dateStr: string, timezone: string): string {
  return fromZonedTime(`${dateStr}T23:59:59.999`, timezone).toISOString();
}

/** El día calendario que ve el editor, proyectando el instante guardado a la zona del usuario. */
export function recurrenceEndsAtDay(instant: string, timezone: string): string {
  return formatInTimeZone(instant, timezone, "yyyy-MM-dd");
}
