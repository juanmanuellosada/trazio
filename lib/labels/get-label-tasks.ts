import { createClient } from "@/lib/supabase/server";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "@/lib/tasks/task-columns";
import { compareLabelTasks } from "./label-tasks-order";

/**
 * Todas las tareas con una etiqueta asignada, sin importar el proyecto
 * (bloque 3.4, requirement "Ruta propia por etiqueta"). En dos pasos en vez
 * de un solo `!inner` embebido: filtrar `tasks` uniendo contra `task_labels`
 * con `!inner` acota también qué filas del propio `task_labels` embebido
 * devuelve PostgREST, así que una tarea con más de una etiqueta perdería sus
 * otras etiquetas en la lista. Primero se resuelven los `task_id` de esta
 * etiqueta (mismo patrón que `useLabelTaskCount`) y después se trae la fila
 * completa de cada tarea, con todas sus etiquetas.
 */
export async function getLabelTasks(userId: string, labelId: string, timezone: string): Promise<TaskRow[]> {
  const supabase = await createClient();

  const { data: taskLabelRows } = await supabase.from("task_labels").select("task_id").eq("label_id", labelId);
  const taskIds = (taskLabelRows ?? []).map((row) => row.task_id);
  if (taskIds.length === 0) return [];

  const { data } = await supabase.from("tasks").select(TASK_LIST_COLUMNS).eq("user_id", userId).in("id", taskIds);
  return ((data ?? []) as unknown as TaskListRawRow[])
    .map(toTaskRow)
    .sort((a, b) => compareLabelTasks(a, b, timezone));
}
