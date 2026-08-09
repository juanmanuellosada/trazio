"use client";

import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

/**
 * `description` de cada tarea de un proyecto, consultada aparte: ese `select`
 * alimenta Bandeja, Hoy, Próximos, Proyecto, Etiqueta, Filtro y Buscador
 * (`lib/tasks/task-columns.ts`, `TASK_LIST_COLUMNS`), y la descripción es
 * jsonb pesada — pagarla en cada carga por una acción ocasional (copiar como
 * markdown) es justo lo que la regla "nada de `select('*')` en listas" de
 * `.claude/rules/database.md` evita. Mismo patrón que
 * `lib/projects/share-link.ts` para `share_token`.
 */

/** Mapa `id de tarea → description` (jsonb de Tiptap), o `null` si la tarea no tiene. */
export type TaskDescriptions = Record<string, Json | null>;

export function taskDescriptionsQueryKey(projectId: string) {
  return ["tasks", "descriptions", projectId] as const;
}

/**
 * El `.order("position")` es obligatorio aunque el resultado se consuma como
 * mapa: Supabase corta en `db-max-rows` (1000 filas por defecto), y si esta
 * consulta y `fetchTasks` (`lib/tasks/use-tasks.ts`) truncaran con órdenes
 * distintos, un proyecto grande copiaría descripciones de tareas que no
 * están en la lista. Con el mismo orden, las dos truncan el mismo
 * subconjunto. No sacarlo para "optimizar".
 */
export async function fetchTaskDescriptions(projectId: string): Promise<TaskDescriptions> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, description")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.id, row.description]));
}

/**
 * Compartido por el prefetch (al abrir el menú) y el fetch (al hacer clic), para
 * que el `staleTime` coincida y el clic reutilice lo que trajo el prefetch.
 * `gcTime` corto a propósito: el jsonb es pesado y no tiene por qué
 * sobrevivir a la sesión.
 */
export function taskDescriptionsQueryOptions(projectId: string) {
  return {
    queryKey: taskDescriptionsQueryKey(projectId),
    queryFn: () => fetchTaskDescriptions(projectId),
    staleTime: 30_000,
    gcTime: 60_000,
  };
}
