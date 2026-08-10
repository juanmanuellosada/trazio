"use client";

import { isTaskOverdue } from "@/lib/dates/today";
import { nextAvailableGap, selectNextTask, type NextTaskCandidate } from "@/lib/planning/next-task";
import type { Habit } from "@/lib/habits/habit-columns";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { useFreeGaps } from "./use-free-gaps";
import type { HoyEventsResult } from "./use-hoy-events";

/**
 * Los tres estados de "¿Qué hago ahora?" (capacidad `que-hago-ahora`,
 * requirements "No hay hueco disponible", "Hay hueco pero ninguna tarea
 * entra" y "Criterio de selección de la tarea propuesta"):
 *
 * - `no-gap`: el próximo bloque agendado empieza en menos de 5 minutos, o
 *   no queda ninguno y el resto del día ya está ocupado. `until` es la hora
 *   hasta la que hay que esperar.
 * - `day-ended`: ya pasó la hora de fin del día — ni siquiera se busca hueco.
 * - `no-candidate`: hay hueco, pero ninguna tarea del pedido sin lugar entra
 *   en su duración (o no hay ninguna candidata).
 * - `proposal`: la tarea elegida (D-D) y el hueco donde entra.
 */
export type NextTaskResult =
  | { status: "day-ended" }
  | { status: "no-gap"; until: Date }
  | { status: "no-candidate" }
  | { status: "proposal"; task: TaskRow };

/**
 * Compone `useFreeGaps` (la primitiva compartida con `carga-del-dia`) con
 * las dos funciones puras de `lib/planning/next-task.ts`: el primer hueco
 * usable y la tarea que entra ahí. Vive acá, hermano de `use-day-load.ts`,
 * por la misma prohibición de siempre (`components/tasks/` no puede
 * importar de `lib/calendar/`).
 */
export function useNextTask({
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
  /** Pendientes de hoy, atrasadas incluidas — mismo pool que `useDayLoad`. */
  tasks: TaskRow[];
  initialHabits: Habit[];
  eventsState: HoyEventsResult;
}): NextTaskResult {
  const { gaps, dayEnded, dayEnd, unassignedTasks } = useFreeGaps({
    todayDate,
    timezone,
    now,
    dayEndTime,
    tasks,
    initialHabits,
    eventsState,
  });

  if (dayEnded) return { status: "day-ended" };

  const gap = nextAvailableGap(gaps);
  if (!gap) {
    // El primer hueco crudo (antes del filtro de 5 minutos) marca hasta
    // cuándo hay que esperar; si no queda ninguno, el resto del día ya está
    // ocupado de punta a punta.
    return { status: "no-gap", until: gaps[0]?.end ?? dayEnd };
  }

  const gapMinutes = (gap.end.getTime() - gap.start.getTime()) / 60_000;
  const candidates: NextTaskCandidate[] = unassignedTasks
    .filter((task) => task.due_date !== null)
    .map((task) => ({
      id: task.id,
      durationMinutes: task.duration_minutes,
      dueDate: task.due_date as string,
      overdue: isTaskOverdue(task, timezone, now),
      deadline: task.deadline,
      priority: task.priority,
      position: task.position,
    }));

  const selected = selectNextTask(candidates, gapMinutes);
  if (!selected) return { status: "no-candidate" };

  const task = unassignedTasks.find((t) => t.id === selected.id);
  if (!task) return { status: "no-candidate" };
  return { status: "proposal", task };
}
