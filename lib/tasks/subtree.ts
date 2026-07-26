import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Tarea y todos sus descendientes (subtareas sin límite de niveles),
 * recorridos en anchura por `parent_id`. Compartido por `duplicate.ts` (F2)
 * y `restore.ts` (deshacer un borrado): ambos necesitan "esta tarea y todo
 * su subárbol", solo cambian las columnas que piden.
 */
export async function fetchTaskSubtree<T extends { id: string; parent_id: string | null }>(
  supabase: SupabaseClient,
  rootId: string,
  columns: string,
): Promise<T[]> {
  const { data: root, error } = await supabase.from("tasks").select(columns).eq("id", rootId).single();
  if (error) throw error;

  const all: T[] = [root as unknown as T];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const { data, error: childError } = await supabase.from("tasks").select(columns).in("parent_id", frontier);
    if (childError) throw childError;
    if (!data || data.length === 0) break;
    const children = data as unknown as T[];
    all.push(...children);
    frontier = children.map((d) => d.id);
  }
  return all;
}
