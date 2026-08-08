"use client";

import { isHabitPendingToday } from "@/lib/habits/pending-today";
import { resolveHabitDayStatus } from "@/lib/habits/day-status";
import type { Habit } from "@/lib/habits/habit-columns";
import { useHabits } from "@/lib/habits/use-habits";
import { useHabitSkipsForDate } from "@/lib/habits/skips";
import { computeDayLoad, type DayLoad, type DayLoadItem } from "@/lib/planning/day-load";
import type { HoyEventsResult } from "./use-hoy-events";

/**
 * Composición de las tres fuentes del tiempo planificado de Hoy (capacidad
 * `carga-del-dia`, D-A de `design.md`): tareas (ya resueltas por el
 * llamador, atrasadas incluidas — Hoy las suma, D-B), hábitos pendientes de
 * hoy y eventos con horario del calendario conectado. Vive acá, hermano de
 * `use-hoy-events.ts`, porque es el único lugar permitido para juntar las
 * tres: `components/tasks/` tiene prohibido importar de `lib/calendar/`
 * (`lib/calendar/tasks-and-habits-never-publish-to-google.test.ts` lo
 * verifica escaneando esa carpeta). El cálculo en sí (`computeDayLoad`) es
 * puro y vive en `lib/planning/day-load.ts`; acá solo se resuelven
 * duraciones y se le pasan — sin `useMemo`, mismo criterio que
 * `ProximosView`/`HoyView` ya usan para sus propios buckets ("filtrar en
 * cada render es barato para el tamaño real de estas listas").
 *
 * Hábitos (D-B): pendientes según `isHabitPendingToday`
 * (`lib/habits/pending-today.ts`, la misma definición única que ya usan los
 * dos contadores de la app) y no salteados — `resolveHabitDayStatus`
 * (`lib/habits/day-status.ts`) es el único lugar que decide entre
 * completado/salteado/pendiente cuando hace falta cruzar `habit_completions`
 * y `habit_skips`, mismo criterio que ya usa el calendario.
 *
 * Eventos (D-D): `eventsState` llega ya resuelto por el llamador (que ya lo
 * tiene, para pintar la secuencia de hoy) en vez de pedirlo de nuevo acá —
 * una sola suscripción a `useHoyEvents` por vista. `loading`, `not_connected`
 * y `unavailable` se tratan igual que "sin eventos": el total sale con lo
 * que hay, sin hueco ni aviso.
 */
export function useDayLoad({
  todayDate,
  timezone,
  now,
  tasks,
  initialHabits,
  eventsState,
}: {
  todayDate: string;
  timezone: string;
  now: Date;
  /** Ya filtradas por el llamador: pendientes, atrasadas incluidas si corresponde (D-B). */
  tasks: { duration_minutes: number | null }[];
  initialHabits: Habit[];
  eventsState: HoyEventsResult;
}): DayLoad {
  const { data: habits } = useHabits(timezone, initialHabits);
  const { data: skippedByHabitId } = useHabitSkipsForDate(todayDate);

  const taskItems: DayLoadItem[] = tasks.map((task) => ({ durationMinutes: task.duration_minutes }));

  const habitItems: DayLoadItem[] = (habits ?? [])
    .filter((habit) => {
      if (!isHabitPendingToday(habit, timezone, now)) return false;
      const skipped = Boolean(skippedByHabitId?.[habit.id]);
      return resolveHabitDayStatus(habit.completed_today, skipped) === "pending";
    })
    .map((habit) => ({ durationMinutes: habit.duration_minutes }));

  const eventItems: DayLoadItem[] =
    eventsState.status === "ok"
      ? eventsState.events
          .filter((event) => !event.allDay)
          .map((event) => ({
            durationMinutes: Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / 60_000),
          }))
      : [];

  return computeDayLoad([...taskItems, ...habitItems, ...eventItems]);
}
