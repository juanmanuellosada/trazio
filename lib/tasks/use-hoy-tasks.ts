"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { hoyCandidatesFilter } from "./hoy-filter";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "./use-tasks";

export function hoyTasksQueryKey() {
  return ["tasks", "hoy"] as const;
}

export async function fetchHoyTasks(userId: string, timezone: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .eq("user_id", userId)
    .or(hoyCandidatesFilter(new Date(), timezone))
    .order("position", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
}

/**
 * Candidatas a la vista Hoy (bloque 8.2): un único caché (`["tasks","hoy"]`)
 * con las atrasadas, las de hoy y las completadas hoy juntas — el
 * bucketing en bloques se recalcula en memoria en cada render
 * (`lib/dates/today.ts`), así que completar o descompletar una tarea
 * (que solo cambia `completed_at` acá adentro) la reubica de bloque solo,
 * sin que la vista tenga que mover la fila entre cachés separados.
 */
export function useHoyTasks(userId: string, timezone: string, initialData?: TaskRow[]) {
  return useQuery({
    queryKey: hoyTasksQueryKey(),
    queryFn: () => fetchHoyTasks(userId, timezone),
    initialData,
  });
}
