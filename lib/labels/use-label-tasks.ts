"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "@/lib/tasks/use-tasks";
import { compareLabelTasks } from "./label-tasks-order";

export function labelTasksQueryKey(labelId: string) {
  return ["tasks", "label", labelId] as const;
}

/** Mismas dos consultas y mismo orden que `get-label-tasks.ts`, ver ese módulo. */
export async function fetchLabelTasks(userId: string, labelId: string, timezone: string): Promise<TaskRow[]> {
  const supabase = createClient();

  const { data: taskLabelRows, error: taskLabelsError } = await supabase
    .from("task_labels")
    .select("task_id")
    .eq("label_id", labelId);
  if (taskLabelsError) throw taskLabelsError;
  const taskIds = (taskLabelRows ?? []).map((row) => row.task_id);
  if (taskIds.length === 0) return [];

  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .eq("user_id", userId)
    .in("id", taskIds);
  if (error) throw error;
  return ((data ?? []) as unknown as TaskListRawRow[])
    .map(toTaskRow)
    .sort((a, b) => compareLabelTasks(a, b, timezone));
}

/**
 * Tareas de una etiqueta, sin importar el proyecto (bloque 3.4). Sin
 * suscripción de Realtime propia (fuera de alcance de este bloque, igual
 * que `use-labels.ts`): un cambio se refleja al volver a esta pantalla o al
 * invalidar `["tasks"]` desde otra mutación.
 */
export function useLabelTasks(userId: string, labelId: string, timezone: string, initialData?: TaskRow[]) {
  return useQuery({
    queryKey: labelTasksQueryKey(labelId),
    queryFn: () => fetchLabelTasks(userId, labelId, timezone),
    initialData,
  });
}
