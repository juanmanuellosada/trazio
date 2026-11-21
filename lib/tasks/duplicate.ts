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
 * `duplicar-un-proyecto` reusa esta función tarea raíz por tarea raíz para
 * copiar un proyecto entero: la copia no puede quedar en el proyecto viejo
 * (el default de acá abajo, `source.project_id`/`source.section_id`, que le
 * sirve al duplicado de una sola tarea). `projectId`/`sectionId` la
 * redirigen: la raíz cae en `sectionId` (ya mapeada a la sección nueva por
 * el llamador), y sus descendientes en `projectId` sin sección — mismo
 * criterio que ya usa `useMoveTask` al cruzar de proyecto (cascada
 * `section_id: null`, `lib/tasks/mutations.ts`): una sección no tiene
 * sentido para una subtarea fuera de su proyecto de origen.
 */
export type DuplicateTaskTreeOptions = {
  projectId?: string;
  sectionId?: string | null;
};

/**
 * Duplica una tarea y sus subtareas, recursivamente (requirement "Duplicar
 * una tarea" del spec de `tareas`, F2 del design): la copia nace pendiente
 * (sin `completed_at`), con su propia `created_at` (no se copia: la deja
 * `default now()` el insert) y sin sufijo en el título. `rootPosition` la
 * ubica en el llamador (`positionAfterOriginal`, `lib/tasks/tree.ts`), acá
 * solo se copian filas. Las etiquetas (`task_labels`) de la raíz y de cada
 * subtarea se copian al final, así que todo llamador las recibe sin repetir
 * esa lógica.
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
  options?: DuplicateTaskTreeOptions,
): Promise<string> {
  const subtree = await fetchTaskSubtree<FullTask>(supabase, rootId, FULL_COLUMNS);
  const root = subtree.find((t) => t.id === rootId);
  if (!root) throw new Error("La tarea original ya no existe.");

  type QueueItem = { source: FullTask; newParentId: string | null; position: number };
  const queue: QueueItem[] = [{ source: root, newParentId: null, position: rootPosition }];
  let newRootId: string | null = null;
  const idMap = new Map<string, string>();

  while (queue.length > 0) {
    const { source, newParentId, position } = queue.shift()!;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: source.user_id,
        project_id: options?.projectId ?? source.project_id,
        section_id: options ? (source.id === rootId ? (options.sectionId ?? null) : null) : source.section_id,
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
    idMap.set(source.id, data.id);

    for (const child of subtree.filter((t) => t.parent_id === source.id)) {
      queue.push({ source: child, newParentId: data.id, position: child.position });
    }
  }

  try {
    const { data: labelLinks, error: labelLinksError } = await supabase
      .from("task_labels")
      .select("task_id, label_id")
      .in("task_id", [...idMap.keys()]);
    if (labelLinksError) throw labelLinksError;

    const newLabelLinks = ((labelLinks ?? []) as { task_id: string; label_id: string }[]).map((link) => ({
      task_id: idMap.get(link.task_id)!,
      label_id: link.label_id,
      user_id: root.user_id,
    }));
    if (newLabelLinks.length > 0) {
      const { error: insertLabelsError } = await supabase.from("task_labels").insert(newLabelLinks);
      if (insertLabelsError) throw insertLabelsError;
    }
  } catch (error) {
    // Compensación: una copia sin etiquetas no debe quedar persistida (un
    // reintento crearía una segunda). Borrar la raíz arrastra las subtareas
    // (`tasks.parent_id` es `on delete cascade`). Si el borrado también
    // falla, igual sube el error original.
    try {
      await supabase.from("tasks").delete().eq("id", newRootId!);
    } catch {
      // Se ignora a propósito: el error que importa es el original.
    }
    throw error;
  }

  return newRootId!;
}
