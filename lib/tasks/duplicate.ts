import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecurrenceAnchor } from "@/lib/recurrence/anchor";
import type { Json } from "@/lib/supabase/database.types";
import { fetchTaskSubtree } from "./subtree";

const FULL_COLUMNS =
  "id, user_id, project_id, section_id, parent_id, title, description, priority, due_date, due_at, duration_minutes, deadline, recurrence_rule, recurrence_ends_at, recurrence_count, recurrence_anchor, position";

type FullTask = {
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
  recurrence_rule: string | null;
  recurrence_ends_at: string | null;
  recurrence_count: number | null;
  recurrence_anchor: RecurrenceAnchor | null;
  position: number;
};

/**
 * Duplica una tarea y sus subtareas, recursivamente (requirement "Duplicar
 * una tarea" del spec de `tareas`, F2 del design): la copia nace pendiente
 * (sin `completed_at`), con su propia `created_at` (no se copia: la deja
 * `default now()` el insert) y sin sufijo en el título. `rootPosition` la
 * ubica en el llamador (`positionAfterOriginal`, `lib/tasks/tree.ts`), acá
 * solo se copian filas.
 *
 * Recorre el subárbol en anchura e inserta de a un nodo por vez, en vez de
 * un insert masivo por nivel: así el `id` nuevo de cada copia se conoce
 * antes de insertar sus hijos, sin depender de que Postgres devuelva un
 * `insert(...).select()` de varias filas en el mismo orden en que se
 * mandaron (no está garantizado).
 */
export async function duplicateTaskTree(
  supabase: SupabaseClient,
  rootId: string,
  rootPosition: number,
): Promise<string> {
  const subtree = await fetchTaskSubtree<FullTask>(supabase, rootId, FULL_COLUMNS);
  const root = subtree.find((t) => t.id === rootId);
  if (!root) throw new Error("La tarea original ya no existe.");

  type QueueItem = { source: FullTask; newParentId: string | null; position: number };
  const queue: QueueItem[] = [{ source: root, newParentId: null, position: rootPosition }];
  let newRootId: string | null = null;

  while (queue.length > 0) {
    const { source, newParentId, position } = queue.shift()!;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: source.user_id,
        project_id: source.project_id,
        section_id: source.section_id,
        parent_id: newParentId,
        title: source.title,
        description: source.description,
        priority: source.priority,
        due_date: source.due_date,
        due_at: source.due_at,
        duration_minutes: source.duration_minutes,
        deadline: source.deadline,
        recurrence_rule: source.recurrence_rule,
        recurrence_ends_at: source.recurrence_ends_at,
        recurrence_count: source.recurrence_count,
        recurrence_anchor: source.recurrence_anchor,
        position,
      })
      .select("id")
      .single();
    if (error) throw error;

    newRootId ??= data.id;

    for (const child of subtree.filter((t) => t.parent_id === source.id)) {
      queue.push({ source: child, newParentId: data.id, position: child.position });
    }
  }

  return newRootId!;
}
