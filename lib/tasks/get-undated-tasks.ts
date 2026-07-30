import { createClient } from "@/lib/supabase/server";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "./task-columns";

/**
 * Tareas sin fecha de vencimiento (bloque 6.9, requirement "Las columnas
 * del panel son los días en Próximos"): la lista de Próximos las deja
 * afuera (`vista-proximos`), pero el modo panel necesita mostrarlas en su
 * columna "Sin fecha" — ahí es donde el arrastre sirve para darles fecha
 * (D-J del design). `includeCompleted` sigue el mismo control "mostrar
 * completadas" de la barra de opciones que `getUpcomingTasks`.
 */
export async function getUndatedTasks(userId: string, includeCompleted = false): Promise<TaskRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .eq("user_id", userId)
    .is("due_date", null)
    .is("due_at", null);
  if (!includeCompleted) query = query.is("completed_at", null);
  const { data } = await query;
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
}
