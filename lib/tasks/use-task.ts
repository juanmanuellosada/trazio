"use client";

import { useQuery } from "@tanstack/react-query";
import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";
import type { LabelChip } from "./use-tasks";

/**
 * Fila completa de una tarea (bloque 7.10/7.11): la única que trae
 * `description` (jsonb de Tiptap, por eso no está en `TaskRow` de las
 * listas) y `created_at`. La usan el panel de detalle y la ruta
 * `app/(app)/tarea/[id]`.
 */
export type TaskDetail = {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  title: string;
  description: Json | null;
  priority: number;
  due_date: string | null;
  due_at: string | null;
  duration_minutes: number | null;
  deadline: string | null;
  completed_at: string | null;
  created_at: string;
  position: number;
  labels: LabelChip[];
};

const TASK_DETAIL_COLUMNS =
  "id, project_id, section_id, parent_id, title, description, priority, due_date, due_at, duration_minutes, deadline, completed_at, created_at, position, task_labels(labels(id, name, color))";

type TaskDetailRawRow = Omit<TaskDetail, "labels"> & {
  task_labels: { labels: LabelChip | null }[] | null;
};

function toTaskDetail(row: TaskDetailRawRow): TaskDetail {
  const { task_labels, ...rest } = row;
  return { ...rest, labels: (task_labels ?? []).map((t) => t.labels).filter((l): l is LabelChip => l != null) };
}

export function taskDetailQueryKey(id: string) {
  return ["tasks", "detail", id] as const;
}

export async function fetchTask(id: string): Promise<TaskDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("tasks").select(TASK_DETAIL_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toTaskDetail(data as unknown as TaskDetailRawRow) : null;
}

export function useTask(id: string | null, initialData?: TaskDetail | null) {
  return useQuery({
    queryKey: taskDetailQueryKey(id ?? ""),
    queryFn: () => fetchTask(id as string),
    initialData,
    enabled: !!id,
  });
}
