/**
 * Los tres estados de un hábito en un día puntual (tarea 6.2 de
 * `calendario-legible-y-manipulable`): "Son tres estados: pendiente,
 * cumplido y salteado. Confundirlos vuelve inútil el registro." Cumplido y
 * salteado viven en tablas separadas (`habit_completions` y `habit_skips`,
 * ver la migración `20260805000000_habit_skips.sql`), así que quien lea
 * las dos necesita un único lugar que decida cuál gana si alguna vez
 * coinciden — sin esta función, cada consumidor (el bloque de calendario,
 * el mini-mapa) inventaría su propio criterio.
 *
 * Cumplido siempre gana: completar un hábito salteado (tarea 6.4, "es
 * reversible") es el camino esperado, y `useMarkHabitDone`
 * (`mutations.ts`) además borra el salteo de ese día al completar, así que
 * en el camino normal los dos nunca coexisten — este orden es solo la red
 * de seguridad para la ventana entre esa doble escritura.
 */
export type HabitDayStatus = "pending" | "done" | "skipped";

export function resolveHabitDayStatus(completed: boolean, skipped: boolean): HabitDayStatus {
  if (completed) return "done";
  if (skipped) return "skipped";
  return "pending";
}
