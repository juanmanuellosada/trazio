import { createClient } from "@/lib/supabase/server";
import type { LabelChip } from "./use-tasks";
import type { TaskDetail } from "./use-task";

const TASK_DETAIL_COLUMNS =
  "id, project_id, section_id, parent_id, title, description, priority, due_date, due_at, duration_minutes, deadline, completed_at, created_at, position, recurrence_rule, recurrence_ends_at, recurrence_count, recurrence_anchor, task_labels(labels(id, name, color))";

type TaskDetailRawRow = Omit<TaskDetail, "labels"> & {
  task_labels: { labels: LabelChip | null }[] | null;
};

/**
 * Tarea completa para sembrar el caché desde un Server Component: la ruta
 * `app/(app)/tarea/[id]` (bloque 7.11), que necesita el título real antes de
 * pintar el `<title>` del documento.
 */
export async function getTask(id: string, userId: string): Promise<TaskDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(TASK_DETAIL_COLUMNS)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  const { task_labels, ...rest } = data as unknown as TaskDetailRawRow;
  return { ...rest, labels: (task_labels ?? []).map((t) => t.labels).filter((l): l is LabelChip => l != null) };
}
