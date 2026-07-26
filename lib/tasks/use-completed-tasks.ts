"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "./use-tasks";

/**
 * Prefijo común de las dos consultas de Completado (bloque 8.5): permite
 * invalidar o parchear lista y contador con una sola llamada de rango
 * (`lib/tasks/mutations.ts`) sin que cada mutación tenga que conocer el
 * `limit` de la página que está montada en ese momento.
 */
const COMPLETED_PREFIX = ["tasks", "completado"] as const;

export function completedTasksQueryKey(limit: number) {
  return [...COMPLETED_PREFIX, "list", limit] as const;
}

export function completedTasksCountQueryKey() {
  return [...COMPLETED_PREFIX, "count"] as const;
}

export async function fetchCompletedTasks(userId: string, limit: number): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .range(0, limit - 1);
  if (error) throw error;
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
}

export async function fetchCompletedTasksCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("completed_at", "is", null);
  if (error) throw error;
  return count ?? 0;
}

/** Página de tareas completadas (bloque 8.5): `limit` crece con "Cargar más", sin re-traer de a una. */
export function useCompletedTasks(userId: string, limit: number, initialData?: TaskRow[]) {
  return useQuery({
    queryKey: completedTasksQueryKey(limit),
    queryFn: () => fetchCompletedTasks(userId, limit),
    initialData,
    placeholderData: (previous) => previous,
  });
}

export function useCompletedTasksCount(userId: string, initialData?: number) {
  return useQuery({
    queryKey: completedTasksCountQueryKey(),
    queryFn: () => fetchCompletedTasksCount(userId),
    initialData,
  });
}
