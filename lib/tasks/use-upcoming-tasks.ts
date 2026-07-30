"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { UPCOMING_WINDOW_DEFAULT_DAYS, compareUpcomingTasks, upcomingCandidatesFilter } from "./upcoming-filter";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "./use-tasks";

export function upcomingTasksQueryKey(windowDays: number = UPCOMING_WINDOW_DEFAULT_DAYS, includeCompleted = false) {
  return ["tasks", "proximos", windowDays, includeCompleted] as const;
}

/** Mismas candidatas y mismo orden que `get-upcoming-tasks.ts`, ver ese módulo. */
export async function fetchUpcomingTasks(
  userId: string,
  timezone: string,
  windowDays: number = UPCOMING_WINDOW_DEFAULT_DAYS,
  includeCompleted = false,
): Promise<TaskRow[]> {
  const supabase = createClient();
  let query = supabase.from("tasks").select(TASK_LIST_COLUMNS).eq("user_id", userId);
  if (!includeCompleted) query = query.is("completed_at", null);
  const { data, error } = await query.or(upcomingCandidatesFilter(new Date(), timezone, windowDays));
  if (error) throw error;
  return ((data ?? []) as unknown as TaskListRawRow[])
    .map(toTaskRow)
    .sort((a, b) => compareUpcomingTasks(a, b, timezone));
}

/**
 * Candidatas a Próximos (bloque 3.6): `windowDays` viaja en la `queryKey`
 * para que cambiar la ventana (control que monta el grupo 6) invalide sola
 * la query correcta, sin pisar el caché de otra ventana. `includeCompleted`
 * (bloque 6.6) también viaja en la `queryKey` por el mismo motivo.
 */
export function useUpcomingTasks(
  userId: string,
  timezone: string,
  windowDays: number = UPCOMING_WINDOW_DEFAULT_DAYS,
  initialData?: TaskRow[],
  includeCompleted = false,
) {
  return useQuery({
    queryKey: upcomingTasksQueryKey(windowDays, includeCompleted),
    queryFn: () => fetchUpcomingTasks(userId, timezone, windowDays, includeCompleted),
    initialData,
  });
}
