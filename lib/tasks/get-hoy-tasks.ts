import { createClient } from "@/lib/supabase/server";
import { compareHoyTasks, hoyCandidatesFilter } from "./hoy-filter";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "./task-columns";

/**
 * Candidatas a la vista Hoy (bloque 8.2), para sembrar el caché desde el
 * Server Component: atrasadas y de hoy pendientes, más las completadas hoy.
 * `now` viaja explícito (nunca `new Date()` del lado del cliente) para que
 * el primer render del cliente use el mismo instante que ya usó el
 * servidor y no haya divergencia de hidratación por el paso del reloj.
 *
 * El orden final lo da `compareHoyTasks` (D25), no `position`: acá se
 * cruzan tareas de proyectos distintos, entre los que `position` no es
 * comparable.
 */
export async function getHoyTasks(userId: string, timezone: string, now: Date): Promise<TaskRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .eq("user_id", userId)
    .or(hoyCandidatesFilter(now, timezone));
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow).sort(compareHoyTasks);
}
