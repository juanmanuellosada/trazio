import { createClient } from "@/lib/supabase/server";
import { UPCOMING_WINDOW_DEFAULT_DAYS, compareUpcomingTasks, upcomingCandidatesFilter } from "./upcoming-filter";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "./task-columns";

/**
 * Candidatas a la vista Próximos (bloque 3.6): atrasadas (sin cota inferior)
 * más las que vencen dentro de la ventana, sin tareas sin fecha (quedan
 * afuera por no matchear ninguna rama del `or`). El orden final lo da
 * `compareUpcomingTasks` en memoria, no `position`, porque estas candidatas
 * cruzan proyectos distintos, igual que en `get-hoy-tasks.ts`.
 *
 * `includeCompleted` (bloque 6.6, control "mostrar completadas" de la barra
 * de opciones): por defecto sigue excluyéndolas, igual que antes de esta
 * capacidad — solo se suman cuando la opción persistida lo pide.
 */
export async function getUpcomingTasks(
  userId: string,
  timezone: string,
  now: Date,
  windowDays: number = UPCOMING_WINDOW_DEFAULT_DAYS,
  includeCompleted = false,
): Promise<TaskRow[]> {
  const supabase = await createClient();
  let query = supabase.from("tasks").select(TASK_LIST_COLUMNS).eq("user_id", userId);
  if (!includeCompleted) query = query.is("completed_at", null);
  const { data } = await query.or(upcomingCandidatesFilter(now, timezone, windowDays));
  return ((data ?? []) as unknown as TaskListRawRow[])
    .map(toTaskRow)
    .sort((a, b) => compareUpcomingTasks(a, b, timezone));
}
