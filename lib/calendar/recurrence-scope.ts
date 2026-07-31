import { RRule } from "rrule";

/**
 * Las tres formas de aplicar un cambio sobre una serie recurrente (D-D del
 * design, tarea 3.5): cada una es una llamada distinta a la API de Google,
 * no una variación de un mismo PATCH.
 *
 * - **"this"**: PATCH/DELETE directo sobre el `id` de la instancia. Crea (o
 *   borra) una excepción puntual; el resto de la serie no se toca.
 * - **"all"**: PATCH/DELETE sobre el evento maestro (`recurringEventId`).
 *   Afecta a toda la serie de una sola llamada.
 * - **"this-and-following"**: Google no tiene un endpoint para esto. Se
 *   implementa partiendo la serie en dos eventos reales, igual que hace el
 *   propio cliente web de Google Calendar: (1) el maestro original se
 *   trunca con un `UNTIL` justo antes de la ocurrencia elegida —así las
 *   ocurrencias previas quedan intactas—, y (2) se crea un evento nuevo que
 *   arranca en esa ocurrencia, con los cambios aplicados y el mismo patrón
 *   de repetición continuando desde ahí. `lib/calendar/events.ts` hace las
 *   dos llamadas; este módulo solo calcula las reglas.
 *
 * Todo acá es aritmética pura sobre lo que ya trae el evento maestro
 * (`recurrence`, un array de líneas RFC 5545), sin tocar la red ni Supabase
 * — por eso es la parte con más tests unitarios de todo el grupo (tarea 3.9).
 */

export type RecurrenceEditScope = "this" | "this-and-following" | "all";

function findRruleLine(recurrenceLines: string[]): { index: number; line: string } | null {
  const index = recurrenceLines.findIndex((line) => line.toUpperCase().startsWith("RRULE:"));
  if (index === -1) return null;
  return { index, line: recurrenceLines[index] };
}

function buildRule(rruleLine: string, dtstart: Date): RRule {
  return new RRule({ ...RRule.parseString(rruleLine), dtstart });
}

/**
 * Formatea `options` de vuelta a una línea RRULE. `RRule.optionsToString`
 * siempre serializa `UNTIL` como `AAAAMMDDTHHMMSSZ` (instante), pero un
 * evento de todo el día tiene un `DTSTART` sin hora (`VALUE=DATE`) y RFC 5545
 * exige que `UNTIL` tenga el mismo tipo de valor que `DTSTART` — así que acá
 * se le recorta la parte de hora cuando la serie es de todo el día.
 */
function toRruleLine(options: ReturnType<typeof RRule.parseString>, isAllDay: boolean): string {
  const line = RRule.optionsToString(options);
  if (!isAllDay) return line;
  return line.replace(/UNTIL=(\d{8})T\d{6}Z/, "UNTIL=$1");
}

/**
 * Ocurrencias de la regla estrictamente anteriores a `splitAt`, contando
 * desde `dtstart`. Se corta apenas encuentra la primera ocurrencia que ya no
 * es anterior, así que también funciona con reglas sin fin (`rule.all` con
 * un predicado nunca las recorre completas).
 */
export function countOccurrencesBefore(recurrenceLines: string[], dtstart: Date, splitAt: Date): number {
  const found = findRruleLine(recurrenceLines);
  if (!found) return 0;
  const rule = buildRule(found.line, dtstart);
  return rule.all((date) => date.getTime() < splitAt.getTime()).length;
}

/**
 * La regla del evento maestro, truncada para que la serie termine justo
 * antes de `splitAt` (tarea 3.5, mitad "pasada" de "esta y las siguientes").
 * Si la regla tenía `COUNT`, se reemplaza por la cantidad exacta de
 * ocurrencias previas —más preciso que `UNTIL` cuando hay patrones `BYDAY`
 * irregulares, donde una fecha límite no siempre cae en una ocurrencia—; si
 * tenía `UNTIL` o no tenía límite, se le pone un `UNTIL` un instante antes
 * de `splitAt`. Las líneas que no son `RRULE` (por ejemplo `EXDATE` de
 * ocurrencias ya borradas antes del corte) viajan sin cambios: siguen
 * describiendo excepciones de la parte de la serie que se conserva.
 */
export function truncateRecurrenceBefore(
  recurrenceLines: string[],
  dtstart: Date,
  splitAt: Date,
  isAllDay: boolean,
): string[] {
  const found = findRruleLine(recurrenceLines);
  if (!found) return recurrenceLines;

  const options = RRule.parseString(found.line);
  if (options.count !== undefined && options.count !== null) {
    options.count = countOccurrencesBefore(recurrenceLines, dtstart, splitAt);
  } else {
    options.until = new Date(splitAt.getTime() - 1000);
  }

  const next = [...recurrenceLines];
  next[found.index] = toRruleLine(options, isAllDay);
  return next;
}

/**
 * La regla para la serie nueva que arranca en `splitAt` (tarea 3.5, mitad
 * "futura"). Mismo patrón (`FREQ`/`INTERVAL`/`BYDAY`/etc.) que la original;
 * si tenía `COUNT`, se resta lo que ya ocurrió antes de `splitAt` —el total
 * de ocurrencias de la serie no cambia, solo dónde vive cada mitad—; si
 * tenía `UNTIL`, se conserva tal cual. Las líneas que no son `RRULE` se
 * copian igual que en `truncateRecurrenceBefore`: si alguna excepción cae
 * después de `splitAt`, sigue aplicando sobre la serie nueva.
 */
export function continueRecurrenceFrom(
  recurrenceLines: string[],
  dtstart: Date,
  splitAt: Date,
  isAllDay: boolean,
): string[] {
  const found = findRruleLine(recurrenceLines);
  if (!found) return recurrenceLines;

  const options = RRule.parseString(found.line);
  if (options.count !== undefined && options.count !== null) {
    const precedingCount = countOccurrencesBefore(recurrenceLines, dtstart, splitAt);
    options.count = Math.max(options.count - precedingCount, 0);
  }

  const next = [...recurrenceLines];
  next[found.index] = toRruleLine(options, isAllDay);
  return next;
}
