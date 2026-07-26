"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProjectColor } from "@/lib/validation/colors";

/** Etiqueta tal como se muestra en un chip (lista o detalle), sin más columnas que las que se usan. */
export type LabelChip = { id: string; name: string; color: ProjectColor };

/**
 * Fila de tarea para las vistas de lista (bloque 7): sin `description` (es
 * jsonb, pesada, y solo hace falta en el detalle — ver `use-task.ts`) y sin
 * `select('*')`. Las etiquetas vienen en el mismo viaje por el join anidado
 * de PostgREST (`task_labels(labels(...))`): traer las etiquetas tarea por
 * tarea sería el N+1 que prohíbe `.claude/rules/database.md`.
 */
export type TaskRow = {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  title: string;
  priority: number;
  due_date: string | null;
  due_at: string | null;
  duration_minutes: number | null;
  deadline: string | null;
  completed_at: string | null;
  position: number;
  labels: LabelChip[];
};

const TASK_LIST_COLUMNS =
  "id, project_id, section_id, parent_id, title, priority, due_date, due_at, duration_minutes, deadline, completed_at, position, task_labels(labels(id, name, color))";

type TaskListRawRow = Omit<TaskRow, "labels"> & {
  task_labels: { labels: LabelChip | null }[] | null;
};

function toTaskRow(row: TaskListRawRow): TaskRow {
  const { task_labels, ...rest } = row;
  return { ...rest, labels: (task_labels ?? []).map((t) => t.labels).filter((l): l is LabelChip => l != null) };
}

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
