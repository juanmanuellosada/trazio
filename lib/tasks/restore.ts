import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecurrenceAnchor } from "@/lib/recurrence/anchor";
import type { Json } from "@/lib/supabase/database.types";
import { fetchTaskSubtree } from "./subtree";

const SNAPSHOT_COLUMNS =
  "id, user_id, project_id, section_id, parent_id, title, description, priority, due_date, due_at, duration_minutes, deadline, completed_at, recurrence_rule, recurrence_ends_at, recurrence_count, recurrence_anchor, position, created_at";

type TaskSnapshotRow = {
  id: string;
  user_id: string;
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
  recurrence_rule: string | null;
  recurrence_ends_at: string | null;
  recurrence_count: number | null;
  recurrence_anchor: RecurrenceAnchor | null;
  position: number;
  created_at: string;
};

type LabelLink = { task_id: string; label_id: string; user_id: string };

type CommentSnapshotRow = {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type TaskSnapshot = { tasks: TaskSnapshotRow[]; labelLinks: LabelLink[]; comments: CommentSnapshotRow[] };

/**
 * Guarda una tarea y todo su subárbol (más sus etiquetas asignadas y sus
 * comentarios) antes de borrarla, para poder deshacer
 * (`.claude/rules/frontend.md`: toda acción destructiva ofrece deshacer, y
 * el requirement "Restaurar una tarea eliminada restaura sus subtareas, sus
 * etiquetas y sus comentarios" de `deshacer`). El borrado en sí sigue
 * siendo físico e inmediato — esto es la fotografía que permite recrearlo
 * tal cual estaba si se deshace la eliminación.
 */
export async function snapshotTaskSubtree(supabase: SupabaseClient, rootId: string): Promise<TaskSnapshot> {
  const tasks = await fetchTaskSubtree<TaskSnapshotRow>(supabase, rootId, SNAPSHOT_COLUMNS);
  const ids = tasks.map((t) => t.id);
  const { data: labelLinks, error } = await supabase
    .from("task_labels")
    .select("task_id, label_id, user_id")
    .in("task_id", ids);
  if (error) throw error;
  const { data: comments, error: commentsError } = await supabase
    .from("comments")
    .select("id, task_id, user_id, content, created_at, updated_at")
    .in("task_id", ids);
  if (commentsError) throw commentsError;
  return {
    tasks,
    labelLinks: (labelLinks ?? []) as LabelLink[],
    comments: (comments ?? []) as CommentSnapshotRow[],
  };
}

/**
 * Recrea exactamente las filas de un snapshot: mismos `id`, mismas fechas.
 * Inserta de a tandas (raíz primero, después cada nivel) para que el
 * `parent_id` de cada tanda ya exista en la base cuando se inserta, y
 * recién después las etiquetas y los comentarios, que dependen de que las
 * tareas ya existan.
 */
export async function restoreTaskSnapshot(supabase: SupabaseClient, snapshot: TaskSnapshot): Promise<void> {
  const inserted = new Set<string>();
  let pending = [...snapshot.tasks];

  while (pending.length > 0) {
    const batch = pending.filter((t) => t.parent_id === null || inserted.has(t.parent_id));
    if (batch.length === 0) {
      throw new Error("No se pudo restaurar la tarea: falta una referencia de padre.");
    }
    const { error } = await supabase.from("tasks").insert(batch);
    if (error) throw error;
    for (const t of batch) inserted.add(t.id);
    pending = pending.filter((t) => !inserted.has(t.id));
  }

  if (snapshot.labelLinks.length > 0) {
    const { error } = await supabase.from("task_labels").insert(snapshot.labelLinks);
    if (error) throw error;
  }

  if (snapshot.comments.length > 0) {
    const { error } = await supabase.from("comments").insert(snapshot.comments);
    if (error) throw error;
  }
}
