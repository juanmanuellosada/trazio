import { createClient } from "@/lib/supabase/server";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "./task-columns";

/**
 * Página de tareas completadas (bloque 8.5), más recientes primero, para
 * sembrar el caché desde el Server Component. Paginación por rango
 * (`.claude/rules/database.md`: "Completado" es una de las listas
 * potencialmente largas que no se traen enteras de una).
 */
export async function getCompletedTasksPage(userId: string, limit: number): Promise<TaskRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .eq("user_id", userId)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .range(0, limit - 1);
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
}

/** Contador del total de completadas (requirement "Vista Completado": "junto con un contador del total"). */
export async function getCompletedTasksCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("completed_at", "is", null);
  return count ?? 0;
}
