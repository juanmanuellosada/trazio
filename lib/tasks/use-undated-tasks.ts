"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "./use-tasks";

export function undatedTasksQueryKey(includeCompleted = false) {
  return ["tasks", "sin-fecha", includeCompleted] as const;
}

/** Mismas candidatas que `get-undated-tasks.ts`, ver ese módulo. */
export async function fetchUndatedTasks(userId: string, includeCompleted = false): Promise<TaskRow[]> {
  const supabase = createClient();
  let query = supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .eq("user_id", userId)
    .is("due_date", null)
    .is("due_at", null);
  if (!includeCompleted) query = query.is("completed_at", null);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
}

/** Solo se usa en el modo panel de Próximos (bloque 6.9), para su columna "Sin fecha". */
export function useUndatedTasks(userId: string, initialData?: TaskRow[], includeCompleted = false) {
  return useQuery({
    queryKey: undatedTasksQueryKey(includeCompleted),
    queryFn: () => fetchUndatedTasks(userId, includeCompleted),
    initialData,
  });
}
