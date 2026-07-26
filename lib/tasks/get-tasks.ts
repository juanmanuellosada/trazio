import { createClient } from "@/lib/supabase/server";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "./task-columns";

/**
 * Todas las tareas de un proyecto, para sembrar desde el Server Component
 * de cada vista el mismo caché que usa `useTasks` en el cliente (D1 del
 * design de fase 1: lectura inicial en el servidor). Mismas columnas y
 * mismo mapeo de etiquetas que `fetchTasks` — la única diferencia es el
 * cliente de Supabase (servidor vs. navegador).
 */
export async function getTasks(projectId: string): Promise<TaskRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
}
