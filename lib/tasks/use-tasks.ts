"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "./task-columns";

export type { LabelChip, TaskListRawRow, TaskRow } from "./task-columns";
export { TASK_LIST_COLUMNS, toTaskRow } from "./task-columns";

export function tasksQueryKey(projectId: string) {
  return ["tasks", "project", projectId] as const;
}

/**
 * Todas las tareas de un proyecto (bloque 7), sin importar sección ni nivel
 * de subtarea: de acá sale, en memoria, el árbol que arma `TaskList`
 * (agrupando por `parent_id`/`section_id`), sin una consulta por nivel.
 */
export async function fetchTasks(projectId: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
}

export function useTasks(projectId: string, initialData?: TaskRow[]) {
  return useQuery({
    queryKey: tasksQueryKey(projectId),
    queryFn: () => fetchTasks(projectId),
    initialData,
  });
}
