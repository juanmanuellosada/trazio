import { format, parseISO, startOfWeek, subDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { todayInTimeZone } from "@/lib/dates/today";

/** Ventana del mini-mapa de la tarjeta (tarea 3.5, spec "El mini-mapa de 14 días es de solo lectura"). */
export const MINI_MAP_DAYS = 14;

export type MiniMapCellStatus = "marked" | "unmarked" | "before-creation" | "skipped";

export type MiniMapCell = { date: string; status: MiniMapCellStatus };

/**
 * Una fecha calendario (`yyyy-MM-dd`) desplazada `n` días hacia atrás.
 * `parseISO` sobre una fecha sin hora no lleva zona horaria involucrada
 * (mismo razonamiento que `lib/habits/today.ts`): es aritmética de
 * calendario pura, así que se formatea de vuelta con `format` (no
 * `formatInTimeZone`, que reinterpretaría el `Date` en otra zona).
 */
function dateNDaysBefore(dateIso: string, n: number): string {
  return format(subDays(parseISO(dateIso), n), "yyyy-MM-dd");
}

/**
 * Las celdas del mini-mapa de los últimos 14 días (tarea 3.5), del más
 * viejo al más nuevo. Un día anterior a `created_at` se distingue como
 * "before-creation" en vez de "unmarked": el requirement "Un hábito no
 * aparece en fechas anteriores a su creación" no debería leerse en el
 * mini-mapa como una racha rota que nunca pudo cumplirse.
 *
 * `skippedDates` es opcional (default vacío, tarea 6.2/spec "Un día
 * salteado se distingue de uno sin hacer" de
 * `calendario-legible-y-manipulable`): un llamador que todavía no trae el
 * historial de salteos sigue funcionando idéntico a antes. Cumplido gana
 * si por algún motivo un día tiene las dos marcas — mismo orden que
 * `resolveHabitDayStatus` en `day-status.ts`, y por la misma razón: no
 * debería pasar en el camino normal, pero si pasa, cumplido es la lectura
 * correcta, no una ambigüedad del mini-mapa.
 */
export function buildMiniMapCells(
  createdAt: string,
  completedDates: readonly string[],
  timezone: string,
  now: Date,
  skippedDates: readonly string[] = [],
): MiniMapCell[] {
  const today = todayInTimeZone(now, timezone);
  const createdDate = formatInTimeZone(createdAt, timezone, "yyyy-MM-dd");
  const marked = new Set(completedDates);
  const skipped = new Set(skippedDates);

  const cells: MiniMapCell[] = [];
  for (let i = MINI_MAP_DAYS - 1; i >= 0; i--) {
    const date = dateNDaysBefore(today, i);
    const status: MiniMapCellStatus =
      date < createdDate
        ? "before-creation"
        : marked.has(date)
          ? "marked"
          : skipped.has(date)
            ? "skipped"
            : "unmarked";
    cells.push({ date, status });
  }
  return cells;
}

/**
 * Progreso de la semana en curso para `times_per_week` (tarea 3.6, spec
 * "N veces por semana muestra progreso semanal en vez de racha de días"):
 * cantidad de marcas entre el lunes de la semana en curso y hoy, siempre
 * lunes a domingo fijo (D-D) — igual que `calcular_racha_habito`, sin usar
 * `week_starts_on`. El lunes de la semana en curso siempre cae dentro de
 * los últimos 7 días, así que ya está incluido en `completedDates` cuando
 * viene del mismo historial de 14 días que alimenta el mini-mapa: no hace
 * falta traer nada aparte.
 */
export function currentWeekProgress(completedDates: readonly string[], timezone: string, now: Date): number {
  const today = todayInTimeZone(now, timezone);
  const monday = format(startOfWeek(parseISO(today), { weekStartsOn: 1 }), "yyyy-MM-dd");
  return completedDates.filter((date) => date >= monday && date <= today).length;
}
