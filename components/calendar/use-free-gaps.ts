"use client";

import { isHabitPendingToday } from "@/lib/habits/pending-today";
import { resolveHabitDayStatus } from "@/lib/habits/day-status";
import type { Habit } from "@/lib/habits/habit-columns";
import { useHabits } from "@/lib/habits/use-habits";
import { useHabitSkipsForDate } from "@/lib/habits/skips";
import { instantFromDayMinutes } from "@/lib/calendar/drag";
import { computeFreeGaps, isDayEnded, type Interval } from "@/lib/planning/free-gaps";
import type { DayLoadItem } from "@/lib/planning/day-load";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { HoyEventsResult } from "./use-hoy-events";

/** `"HH:mm:ss"` a minutos desde la medianoche, mismo patrón que ya usa `lib/calendar/screen-blocks.ts` para lo mismo. */
function minutesFromTimeString(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

export type FreeGapsResult = {
  /** Huecos libres entre ahora y la hora de fin del día, ordenados de más próximo a más lejano (`carga-del-dia` suma todos; `que-hago-ahora` toma el primero). */
  gaps: Interval[];
  dayEnded: boolean;
  /** El instante de la hora de fin del día (D-E de `que-hago-ahora`: "ocupado hasta" cae acá cuando no queda ningún hueco entre ahora y el fin del día). */
  dayEnd: Date;
  /** Tareas y hábitos pendientes sin hora — el pool de "pedido sin lugar" de `carga-del-dia`, con o sin duración estimada. */
  unassignedItems: DayLoadItem[];
  /** Solo las tareas de ese mismo pool (D-D de `que-hago-ahora`: los hábitos nunca son candidatos, no tienen prioridad ni `deadline`). */
  unassignedTasks: TaskRow[];
};

/**
 * Primitiva compartida de `carga-del-dia` y `que-hago-ahora`
 * (`openspec/changes/el-dia-que-entra/design.md`, D-B): arma los bloques
 * ocupados del día desde las tres fuentes (eventos con horario, tareas con
 * `due_at` de hoy, hábitos con hora efectiva de hoy) y llama a
 * `computeFreeGaps`. Vive acá, hermano de `use-day-load.ts` y
 * `use-hoy-events.ts`, por la misma prohibición que ya documentan esos dos:
 * `components/tasks/` no puede importar de `lib/calendar/`
 * (`lib/calendar/tasks-and-habits-never-publish-to-google.test.ts`).
 *
 * **Comprometido vs. sin duración (D-A/D-E del design).** Una tarea con hora
 * pero sin `duration_minutes` no tiene con qué medir cuánto ocupa: no entra
 * a `busyBlocks` (no resta tiempo libre — "lo que no tiene duración
 * estimada NUNCA SHALL sumarse ni al tiempo libre ni al pedido sin lugar"),
 * pero sigue contando para el indicador de "sin duración" del llamador
 * (`unassignedItems` la incluye con `durationMinutes: null`, aunque tenga
 * hora — el pool se llama "sin lugar" por el conteo, no porque todas
 * carezcan de hora). Un hábito nunca tiene este problema: `duration_minutes`
 * no es nulleable en `habits`.
 *
 * `loading`/`not_connected`/`unavailable` de `eventsState` se tratan igual
 * que "sin eventos" (mismo criterio que `useHoyEvents`/`useDayLoad`): sin
 * Google conectado o con Google caído, el cálculo sigue con lo que hay.
 */
export function useFreeGaps({
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
  /** Pendientes de hoy, atrasadas incluidas — ya resueltas por el llamador (overdue + today). */
  tasks: TaskRow[];
  initialHabits: Habit[];
  eventsState: HoyEventsResult;
}): FreeGapsResult {
  const { data: habits } = useHabits(timezone, initialHabits);
  const { data: skippedByHabitId } = useHabitSkipsForDate(todayDate);

  const pendingHabits = (habits ?? []).filter((habit) => {
    if (!isHabitPendingToday(habit, timezone, now)) return false;
    const skipped = Boolean(skippedByHabitId?.[habit.id]);
    return resolveHabitDayStatus(habit.completed_today, skipped) === "pending";
  });

  const dayEnd = instantFromDayMinutes(todayDate, minutesFromTimeString(dayEndTime), timezone);

  const tasksWithHour = tasks.filter((task) => task.due_at !== null);
  const tasksWithoutHour = tasks.filter((task) => task.due_at === null);
  const habitsWithHour = pendingHabits.filter((habit) => habit.scheduled_time !== null);
  const habitsWithoutHour = pendingHabits.filter((habit) => habit.scheduled_time === null);

  const taskBlocks: Interval[] = tasksWithHour
    .filter((task) => task.duration_minutes !== null)
    .map((task) => {
      const start = new Date(task.due_at as string);
      return { start, end: new Date(start.getTime() + (task.duration_minutes as number) * 60_000) };
    });

  const habitBlocks: Interval[] = habitsWithHour.map((habit) => {
    const start = instantFromDayMinutes(todayDate, minutesFromTimeString(habit.scheduled_time as string), timezone);
    return { start, end: new Date(start.getTime() + habit.duration_minutes * 60_000) };
  });

  const eventBlocks: Interval[] =
    eventsState.status === "ok"
      ? eventsState.events.filter((event) => !event.allDay).map((event) => ({ start: new Date(event.start), end: new Date(event.end) }))
      : [];

  const gaps = computeFreeGaps({ now, dayEnd, busyBlocks: [...taskBlocks, ...habitBlocks, ...eventBlocks] });

  // "Sin duración" cuenta cualquier tarea sin medir, tenga hora o no
  // (comentario de arriba): las con hora aportan `null` acá para que
  // `computeDayLoad` las sume al conteo sin sumarlas al total sin lugar.
  const unassignedItems: DayLoadItem[] = [
    ...tasksWithoutHour.map((task) => ({ durationMinutes: task.duration_minutes })),
    ...tasksWithHour.filter((task) => task.duration_minutes === null).map(() => ({ durationMinutes: null })),
    ...habitsWithoutHour.map((habit) => ({ durationMinutes: habit.duration_minutes })),
  ];

  return { gaps, dayEnded: isDayEnded(now, dayEnd), dayEnd, unassignedItems, unassignedTasks: tasksWithoutHour };
}
