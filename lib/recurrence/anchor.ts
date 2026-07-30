/**
 * D-D del design de `fase-2-potencia`: el ancla de la recurrencia se deriva
 * del propio RRULE, sin columna nueva. Una regla anclada al calendario
 * (`BYDAY`, `BYMONTHDAY` o `BYMONTH` — "cada lunes", "cada día laborable",
 * "cada mes") calcula la próxima ocurrencia desde la fecha de vencimiento
 * original, para que "cada lunes" siga cayendo lunes. Una regla de
 * intervalo puro (`FREQ=DAILY;INTERVAL=3`, sin ningún componente `BY*`)
 * calcula desde la fecha de completado: "regar las plantas cada 3 días"
 * cuenta desde que se regó.
 */

export type RecurrenceAnchor = "due" | "completion";

const CALENDAR_ANCHORED_RE = /\bBY(?:DAY|MONTHDAY|MONTH)=/;

export function deriveAnchor(rrule: string): RecurrenceAnchor {
  return CALENDAR_ANCHORED_RE.test(rrule) ? "due" : "completion";
}
