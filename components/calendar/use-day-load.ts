"use client";

import type { Habit } from "@/lib/habits/habit-columns";
import { computeDayLoad, type FreeTimeSummary } from "@/lib/planning/day-load";
import { sumGapMinutes } from "@/lib/planning/free-gaps";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { useFreeGaps } from "./use-free-gaps";
import type { HoyEventsResult } from "./use-hoy-events";

/**
 * Resumen del encabezado de Hoy (capacidad `carga-del-dia`, D-A/D-B de
 * `openspec/changes/el-dia-que-entra/design.md`): tiempo libre restante del
 * día (suma de todos los huecos de `useFreeGaps`, la primitiva compartida
 * con `que-hago-ahora`) más el pedido sin lugar (`computeDayLoad` sobre esa
 * misma clasificación — el cálculo en sí no cambió, ver el comentario de
 * `lib/planning/day-load.ts`). `formatCargaDelDia` convierte esto en el
 * texto final.
 *
 * Vive acá, hermano de `use-hoy-events.ts`/`use-free-gaps.ts`, por la misma
 * prohibición de siempre: `components/tasks/` no puede importar de
 * `lib/calendar/` (`lib/calendar/tasks-and-habits-never-publish-to-google.test.ts`).
 */
export function useDayLoad({
  todayDate,
  timezone,
  now,
  dayEndTime,
  tasks,
  initialHabits,
  eventsState,
}: {
  todayDate: string;
  timezone: string;
  now: Date;
  /** `user_preferences.day_end_time`, `"HH:mm:ss"`. */
  dayEndTime: string;
  /** Ya filtradas por el llamador: pendientes, atrasadas incluidas (D-B: en Hoy las atrasadas cuentan como trabajo del día). */
  tasks: TaskRow[];
  initialHabits: Habit[];
  eventsState: HoyEventsResult;
}): FreeTimeSummary {
  const { gaps, dayEnded, unassignedItems } = useFreeGaps({ todayDate, timezone, now, dayEndTime, tasks, initialHabits, eventsState });

  return { freeMinutes: sumGapMinutes(gaps), dayEnded, unassigned: computeDayLoad(unassignedItems) };
}
