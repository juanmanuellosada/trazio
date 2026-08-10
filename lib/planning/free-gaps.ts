/**
 * Huecos libres del día (capacidad `carga-del-dia` y `que-hago-ahora`, D-B de
 * `openspec/changes/el-dia-que-entra/design.md`): cálculo puro sobre
 * intervalos ya resueltos, nunca sobre tareas, hábitos ni eventos — mismo
 * principio que `lib/planning/day-load.ts`, del que esta primitiva es
 * vecina. `components/calendar/` es quien arma `busyBlocks` a partir de las
 * tres fuentes (eventos con horario, tareas con `due_at`, hábitos con hora
 * efectiva); acá no se sabe nada de eso.
 */

export type Interval = { start: Date; end: Date };

/** Si `now` ya pasó la hora de fin del día: el tiempo libre se clampea a cero (D-E), nunca negativo. */
export function isDayEnded(now: Date, dayEnd: Date): boolean {
  return now.getTime() >= dayEnd.getTime();
}

/**
 * Fusiona los bloques ocupados que se superponen, los recorta contra la
 * ventana `[now, dayEnd]` (un bloque que ya terminó desaparece; uno en curso
 * queda recortado a lo que falta) y devuelve los huecos entre ellos,
 * ordenados de más próximo a más lejano — el primero es el que consume
 * `que-hago-ahora`; la suma de todos es el tiempo libre de `carga-del-dia`.
 *
 * El día terminado (`now >= dayEnd`) no tiene ventana: devuelve `[]` sin
 * mirar `busyBlocks`.
 */
export function computeFreeGaps({
  now,
  dayEnd,
  busyBlocks,
}: {
  now: Date;
  dayEnd: Date;
  busyBlocks: Interval[];
}): Interval[] {
  if (isDayEnded(now, dayEnd)) return [];

  const clipped = busyBlocks
    .map((block) => ({
      start: block.start.getTime() < now.getTime() ? now : block.start,
      end: block.end.getTime() > dayEnd.getTime() ? dayEnd : block.end,
    }))
    .filter((block) => block.start.getTime() < block.end.getTime())
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: Interval[] = [];
  for (const block of clipped) {
    const last = merged[merged.length - 1];
    if (last && block.start.getTime() <= last.end.getTime()) {
      if (block.end.getTime() > last.end.getTime()) last.end = block.end;
    } else {
      merged.push({ ...block });
    }
  }

  const gaps: Interval[] = [];
  let cursor = now;
  for (const block of merged) {
    if (block.start.getTime() > cursor.getTime()) gaps.push({ start: cursor, end: block.start });
    if (block.end.getTime() > cursor.getTime()) cursor = block.end;
  }
  if (cursor.getTime() < dayEnd.getTime()) gaps.push({ start: cursor, end: dayEnd });

  return gaps;
}

/** Suma de todos los huecos, en minutos: el tiempo libre total de `carga-del-dia`. */
export function sumGapMinutes(gaps: Interval[]): number {
  return gaps.reduce((total, gap) => total + (gap.end.getTime() - gap.start.getTime()) / 60_000, 0);
}
