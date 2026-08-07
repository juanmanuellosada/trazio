import { addDays, differenceInMinutes, format, parseISO } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

/**
 * Aritmética pura del arrastre y el redimensionado (tareas 6.1/6.2, D-F de
 * `design.md`): nada acá sabe de tareas/hábitos/eventos ni de píxeles de
 * pantalla ni de React — solo de minutos e instantes. El ajuste a 15
 * minutos vive en una sola función para que mover y redimensionar nunca
 * puedan desincronizarse, mismo principio que `packIntervals` en
 * `layout.ts` (geometría compartida, no duplicada por cada componente).
 */

export const SNAP_MINUTES = 15;
export const MIN_BLOCK_MINUTES = SNAP_MINUTES;
export const DAY_MINUTES = 24 * 60;

export type DragResult = { start: Date; end: Date };

/** Ajusta unos minutos al múltiplo de 15 más cercano (requirement "nunca a un horario que no sea múltiplo de 15 minutos"). */
export function snapToQuarterHour(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

export function clampMinutes(minutes: number, min: number, max: number): number {
  return Math.min(Math.max(minutes, min), max);
}

/** Convierte un desplazamiento vertical en píxeles a minutos, dada la altura de una hora en la grilla (`HOUR_ROW_HEIGHT_PX` de `grid-metrics.ts`). */
export function pixelsToMinutes(deltaPixels: number, pixelsPerHour: number): number {
  return (deltaPixels / pixelsPerHour) * 60;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function addDaysToDateKey(dateKey: string, days: number): string {
  return format(addDays(parseISO(dateKey), days), "yyyy-MM-dd");
}

/** Minutos desde la medianoche local de `instant`, en `timezone`. */
export function localMinutesOfDay(instant: Date, timezone: string): number {
  const [hour, minute] = formatInTimeZone(instant, timezone, "HH:mm").split(":").map(Number);
  return hour * 60 + minute;
}

/**
 * El instante correspondiente a `minutes` contados desde la medianoche de
 * `dateKey` en `timezone`. `minutes` puede ser >= 1440 (cae en un día
 * siguiente) o negativo (un día anterior): se usa para las 24:00 exactas
 * de un redimensionado hasta el final del día, sin tratarlas como un caso
 * especial aparte.
 */
export function instantFromDayMinutes(dateKey: string, minutes: number, timezone: string): Date {
  const dayOffset = Math.floor(minutes / DAY_MINUTES);
  const minutesOfDay = minutes - dayOffset * DAY_MINUTES;
  const targetDateKey = dayOffset === 0 ? dateKey : addDaysToDateKey(dateKey, dayOffset);
  const hour = Math.floor(minutesOfDay / 60);
  const minute = minutesOfDay % 60;
  return fromZonedTime(`${targetDateKey}T${pad(hour)}:${pad(minute)}:00.000`, timezone);
}

/** `HH:mm:ss`, el formato que espera `habit_schedule_overrides.scheduled_time`. */
export function minutesToTimeString(minutes: number): string {
  const clamped = clampMinutes(minutes, 0, DAY_MINUTES);
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${pad(hour)}:${pad(minute)}:00`;
}

/**
 * Resultado de mover un bloque a una nueva posición vertical dentro de
 * `targetDateKey` (tarea 6.1): conserva la duración del bloque original,
 * ajusta el inicio resultante a 15 minutos, y lo recorta para que el
 * bloque entero quepa dentro de un día — la duración no cambia acá, así
 * que nunca puede quedar en cero o negativa por este camino (eso es cosa
 * de `resizeBlockToPosition`).
 *
 * `rawStartMinutes` ya viene calculado por quien arma la grilla (la
 * posición vertical del puntero al soltar, en minutos) — esta función no
 * sabe de píxeles, solo de minutos.
 */
export function moveBlockToPosition(rawStartMinutes: number, durationMinutes: number, targetDateKey: string, timezone: string): DragResult {
  const snapped = snapToQuarterHour(rawStartMinutes);
  const clampedStart = clampMinutes(snapped, 0, DAY_MINUTES - durationMinutes);
  return {
    start: instantFromDayMinutes(targetDateKey, clampedStart, timezone),
    end: instantFromDayMinutes(targetDateKey, clampedStart + durationMinutes, timezone),
  };
}

/**
 * Resultado de estirar el borde inferior de un bloque (tarea 6.2): el
 * inicio no se toca, el fin se ajusta a 15 minutos y nunca baja de
 * `MIN_BLOCK_MINUTES` de duración ni cruza la medianoche del día en que
 * empieza el bloque.
 */
export function resizeBlockToPosition(originalStart: Date, rawEndMinutes: number, timezone: string): DragResult {
  const dateKey = formatInTimeZone(originalStart, timezone, "yyyy-MM-dd");
  const startMinutes = localMinutesOfDay(originalStart, timezone);
  const snappedEnd = snapToQuarterHour(rawEndMinutes);
  const clampedEnd = clampMinutes(snappedEnd, startMinutes + MIN_BLOCK_MINUTES, DAY_MINUTES);
  return { start: originalStart, end: instantFromDayMinutes(dateKey, clampedEnd, timezone) };
}

/** Duración en minutos entre dos instantes ISO, redondeada — atajo usado por los traductores de cada dominio (`block-drag-translate.ts`). */
export function durationMinutesBetween(startIso: string, endIso: string): number {
  return differenceInMinutes(parseISO(endIso), parseISO(startIso));
}

/**
 * Guard contra el defecto "soltar donde estaba dispara una mutación": el
 * `activationConstraint` de 8px (`calendar-view.tsx`) ya evita que un clic
 * suelto arranque un arrastre, pero no evita que un arrastre real termine
 * exactamente donde empezó (por ejemplo, un movimiento solo horizontal
 * dentro de la misma columna, o uno vertical chico que vuelve a snapear a
 * la misma ranura de 15 minutos). `handleMoveOrResize`
 * (`screen-calendar.tsx`) llama a esto antes de mutar nada — si el rango de
 * destino coincide con el rango actual del bloque, no hay nada que editar:
 * ni mutación, ni el diálogo de recurrencia. Comparación por instante
 * (`Date.getTime()`), no por string ISO, porque `range.start`/`range.end`
 * son objetos `Date`, no el string crudo de `block.start`/`block.end`.
 */
export function isSameRange(blockStart: string, blockEnd: string, range: DragResult): boolean {
  return parseISO(blockStart).getTime() === range.start.getTime() && parseISO(blockEnd).getTime() === range.end.getTime();
}
