import { addDays, differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import type { CalendarBlock, CalendarFormat } from "./block";

/**
 * Geometría pura de la grilla del calendario (tarea 5.8): nada acá importa
 * React ni sabe de tareas/hábitos/eventos, solo de `CalendarBlock` (D-F).
 * Todo lo que resuelve minutos u orden de días lo hace en instantes
 * absolutos, nunca comparando strings de hora a mano — es lo que evita el
 * bug clásico del evento que cruza la medianoche.
 */

function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function nextDateKey(dateKey: string): string {
  return toDateKey(addDays(parseISO(dateKey), 1));
}

/** Instantes de 00:00 y 24:00 de `dateKey` en `timezone` (D8: siempre en la zona del usuario, nunca UTC ni la del servidor). */
function zonedDayBounds(dateKey: string, timezone: string): { start: Date; end: Date } {
  return {
    start: fromZonedTime(`${dateKey}T00:00:00.000`, timezone),
    end: fromZonedTime(`${nextDateKey(dateKey)}T00:00:00.000`, timezone),
  };
}

export type TimedSegment = {
  block: CalendarBlock;
  dateKey: string;
  /** Minutos desde medianoche, recortados a `[0, 1440]` para este día. */
  startMinutes: number;
  endMinutes: number;
};

/**
 * Recorta los bloques con horario a la porción que cae dentro de
 * `dateKey` (00:00 a 24:00 en la zona del usuario). Un bloque que cruza la
 * medianoche produce un segmento en cada día que toca, cada uno con sus
 * propios minutos — comparando instantes absolutos en vez de la hora local
 * como texto, así no hace falta ningún caso especial para la medianoche.
 */
export function segmentsForDay(blocks: CalendarBlock[], dateKey: string, timezone: string): TimedSegment[] {
  const { start: dayStart, end: dayEnd } = zonedDayBounds(dateKey, timezone);
  const segments: TimedSegment[] = [];

  for (const block of blocks) {
    if (block.allDay) continue;
    const blockStart = parseISO(block.start);
    const blockEnd = parseISO(block.end);
    const segStart = blockStart > dayStart ? blockStart : dayStart;
    const segEnd = blockEnd < dayEnd ? blockEnd : dayEnd;
    if (segStart >= segEnd) continue;

    segments.push({
      block,
      dateKey,
      startMinutes: Math.round((segStart.getTime() - dayStart.getTime()) / 60_000),
      endMinutes: Math.round((segEnd.getTime() - dayStart.getTime()) / 60_000),
    });
  }

  return segments;
}

export type PackedLane<T> = { item: T; lane: number; laneCount: number };

/**
 * Reparte intervalos que se solapan en carriles sin pisarse (tarea 5.6):
 * agrupa en clusters transitivos (conectados por solapamiento, no solo
 * pares) y asigna cada intervalo al primer carril donde entra —el mismo
 * algoritmo de coloreo de intervalos que resuelve "cuántas salas hacen
 * falta". La usan tanto la grilla horaria (carriles = columnas, minutos)
 * como la fila de todo el día (carriles = filas, índices de día): es
 * geometría genérica, no sabe de calendario.
 */
export function packIntervals<T>(items: T[], getStart: (item: T) => number, getEnd: (item: T) => number): PackedLane<T>[] {
  const sorted = [...items].sort((a, b) => getStart(a) - getStart(b) || getEnd(a) - getEnd(b));

  const clusters: T[][] = [];
  let current: T[] = [];
  let clusterEnd = -Infinity;
  for (const item of sorted) {
    if (current.length > 0 && getStart(item) >= clusterEnd) {
      clusters.push(current);
      current = [];
      clusterEnd = -Infinity;
    }
    current.push(item);
    clusterEnd = Math.max(clusterEnd, getEnd(item));
  }
  if (current.length > 0) clusters.push(current);

  const result: PackedLane<T>[] = [];
  for (const cluster of clusters) {
    const laneEnds: number[] = [];
    const placements: { item: T; lane: number }[] = [];
    for (const item of cluster) {
      const freeLane = laneEnds.findIndex((end) => getStart(item) >= end);
      const lane = freeLane === -1 ? laneEnds.length : freeLane;
      laneEnds[lane] = getEnd(item);
      placements.push({ item, lane });
    }
    const laneCount = laneEnds.length;
    for (const { item, lane } of placements) result.push({ item, lane, laneCount });
  }

  return result;
}

export type PositionedBlock = TimedSegment & { columnIndex: number; columnCount: number };

/** Disposición completa de un día de la grilla horaria (tarea 5.6): recorte a la medianoche + reparto de columnas, en un solo paso. */
export function layoutTimedBlocksForDay(blocks: CalendarBlock[], dateKey: string, timezone: string): PositionedBlock[] {
  const segments = segmentsForDay(blocks, dateKey, timezone);
  const packed = packIntervals(
    segments,
    (segment) => segment.startMinutes,
    (segment) => segment.endMinutes,
  );
  return packed.map(({ item, lane, laneCount }) => ({ ...item, columnIndex: lane, columnCount: laneCount }));
}

/** Minutos desde medianoche de `now` dentro de `dateKey`, o `null` si `now` no cae ese día en `timezone` (D8). */
export function currentTimeMinutes(now: Date, dateKey: string, timezone: string): number | null {
  if (formatInTimeZone(now, timezone, "yyyy-MM-dd") !== dateKey) return null;
  const { start } = zonedDayBounds(dateKey, timezone);
  return Math.round((now.getTime() - start.getTime()) / 60_000);
}

export type AllDaySpan = {
  block: CalendarBlock;
  /** Índice en `visibleDays` donde empieza a verse (ya recortado al rango visible). */
  startIndex: number;
  /** Cantidad de días visibles que ocupa, siempre >= 1. */
  span: number;
};

/**
 * Bloques de todo el día recortados al rango visible (tarea 5.7 lo pide
 * explícitamente para las vistas previas de repetición, y vale igual para
 * cualquier bloque de todo el día): nada se dibuja fuera de `visibleDays`.
 * `end` es exclusivo, la misma convención que usa Google Calendar para
 * `end.date`.
 */
export function allDaySpans(blocks: CalendarBlock[], visibleDays: string[]): AllDaySpan[] {
  if (visibleDays.length === 0) return [];
  const rangeStart = visibleDays[0]!;
  const rangeEndExclusive = nextDateKey(visibleDays[visibleDays.length - 1]!);

  const spans: AllDaySpan[] = [];
  for (const block of blocks) {
    if (!block.allDay) continue;
    const clippedStart = block.start < rangeStart ? rangeStart : block.start;
    const clippedEnd = block.end > rangeEndExclusive ? rangeEndExclusive : block.end;
    if (clippedStart >= clippedEnd) continue;

    const startIndex = visibleDays.indexOf(clippedStart);
    const span = differenceInCalendarDays(parseISO(clippedEnd), parseISO(clippedStart));
    if (startIndex === -1 || span <= 0) continue;
    spans.push({ block, startIndex, span });
  }
  return spans;
}

export type PositionedAllDayBlock = AllDaySpan & { rowIndex: number; rowCount: number };

/** Disposición de la fila de todo el día (tarea 5.1/5.6): recorte al rango visible + reparto de filas para que dos bloques que se solapan en días no se tapen. */
export function layoutAllDayRow(blocks: CalendarBlock[], visibleDays: string[]): PositionedAllDayBlock[] {
  const spans = allDaySpans(blocks, visibleDays);
  const packed = packIntervals(
    spans,
    (span) => span.startIndex,
    (span) => span.startIndex + span.span,
  );
  return packed.map(({ item, lane, laneCount }) => ({ ...item, rowIndex: lane, rowCount: laneCount }));
}

/** Todos los bloques que tocan `dateKey` (de todo el día y con horario), en el orden en que se listan en un día del formato mes: primero los de todo el día, después los que tienen hora, por hora. */
export function blocksForDay(blocks: CalendarBlock[], dateKey: string, timezone: string): CalendarBlock[] {
  const allDay = blocks.filter((block) => block.allDay && block.start <= dateKey && dateKey < block.end);
  const timed = segmentsForDay(blocks, dateKey, timezone)
    .sort((a, b) => a.startMinutes - b.startMinutes)
    .map((segment) => segment.block);
  return [...allDay, ...timed];
}

/**
 * Los días visibles de cada formato (tarea 5.2/5.3, D-E): los cuatro
 * formatos existen siempre, esto solo calcula el rango de fechas de cada
 * uno — el ancho de pantalla no decide qué formato se puede elegir, solo
 * cómo se dibuja el que ya se eligió (eso es cosa de los componentes, no
 * de esta función).
 */
export function visibleDaysForFormat(viewFormat: CalendarFormat, anchorDate: string, weekStartsOn: 0 | 1 | 6): string[] {
  const anchor = parseISO(anchorDate);

  switch (viewFormat) {
    case "dia":
      return [anchorDate];
    case "cuatro-dias":
      return [0, 1, 2, 3].map((offset) => toDateKey(addDays(anchor, offset)));
    case "semana":
      return eachDayOfInterval({ start: startOfWeek(anchor, { weekStartsOn }), end: endOfWeek(anchor, { weekStartsOn }) }).map(toDateKey);
    case "mes": {
      const monthStart = startOfMonth(anchor);
      const monthEnd = endOfMonth(anchor);
      return eachDayOfInterval({
        start: startOfWeek(monthStart, { weekStartsOn }),
        end: endOfWeek(monthEnd, { weekStartsOn }),
      }).map(toDateKey);
    }
  }
}
