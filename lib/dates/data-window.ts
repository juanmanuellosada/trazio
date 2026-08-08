import { addDays, format, parseISO, startOfWeek } from "date-fns";

/**
 * Ventana de datos del calendario continuo (tarea 5, `design.md` decisión
 * 4): los cuatro hooks de rango (`useCalendarRangeEvents`,
 * `useHabitScheduleOverridesForRange`, `useHabitSkipsForRange`,
 * `useHabitCompletionsForRange`) dejan de pedir el rango visible exacto —
 * correrse un día generaría una `queryKey` nueva y volvería a consultar
 * todo— y pasan a pedir por **trozos de semana ISO fijos** (lunes a
 * domingo, sin depender de `weekStartsOn` del usuario): correrse un día
 * reutiliza los trozos que ya estaban en caché y a lo sumo agrega uno.
 */

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Lunes (ISO) de la semana que contiene `dateKey`, sin importar `weekStartsOn` del usuario: la partición en trozos es una decisión de caché, no de interfaz. */
export function isoWeekStart(dateKey: string): string {
  return toDateKey(startOfWeek(parseISO(dateKey), { weekStartsOn: 1 }));
}

/** Domingo de la semana que empieza en `weekStartDateKey`. */
export function isoWeekEnd(weekStartDateKey: string): string {
  return toDateKey(addDays(parseISO(weekStartDateKey), 6));
}

/** Lunes de cada semana ISO que cubre `[startDate, endDate]`, sin repetidos, en orden. */
export function isoWeekChunksCovering(startDate: string, endDate: string): string[] {
  const chunks: string[] = [];
  let cursor = isoWeekStart(startDate);
  const lastChunk = isoWeekStart(endDate);
  while (cursor <= lastChunk) {
    chunks.push(cursor);
    cursor = toDateKey(addDays(parseISO(cursor), 7));
  }
  return chunks;
}

/** Semanas hacia cada lado del rango visible que se piden por adelantado (tarea 5.3): "dos semanas a cada lado". */
export const DATA_WINDOW_MARGIN_WEEKS = 2;

/**
 * Trozos de semana ISO a pedir para que un rango visible esté cargado con
 * margen (tarea 5.3): lo visible más `DATA_WINDOW_MARGIN_WEEKS` semanas
 * antes y después, para que desplazarse hacia un día vecino lo encuentre
 * ya cargado.
 */
export function dataWindowChunks(visibleDays: string[]): string[] {
  if (visibleDays.length === 0) return [];
  const first = visibleDays[0]!;
  const last = visibleDays[visibleDays.length - 1]!;
  const paddedStart = toDateKey(addDays(parseISO(first), -DATA_WINDOW_MARGIN_WEEKS * 7));
  const paddedEnd = toDateKey(addDays(parseISO(last), DATA_WINDOW_MARGIN_WEEKS * 7));
  return isoWeekChunksCovering(paddedStart, paddedEnd);
}
