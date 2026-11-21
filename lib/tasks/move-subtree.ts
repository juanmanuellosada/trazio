import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchTaskSubtree } from "./subtree";

export type DescendantRow = { id: string; parent_id: string | null; project_id: string; section_id: string | null };

/** Descendientes de una tarea (sin ella), leídos de la base y no del caché de la interfaz. */
export async function fetchDescendants(supabase: SupabaseClient, rootId: string): Promise<DescendantRow[]> {
  const subtree = await fetchTaskSubtree<DescendantRow>(supabase, rootId, "id, parent_id, project_id, section_id");
  return subtree.filter((t) => t.id !== rootId);
}

/** Lleva las subtareas al proyecto destino y les limpia la sección, que ya no tiene sentido ahí. */
export async function cascadeProjectToDescendants(
  supabase: SupabaseClient,
  descendantIds: string[],
  toProjectId: string,
): Promise<void> {
  if (descendantIds.length === 0) return;
  const { error } = await supabase
    .from("tasks")
    .update({ project_id: toProjectId, section_id: null })
    .in("id", descendantIds);
  if (error) throw error;
}
