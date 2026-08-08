import { createClient } from "@/lib/supabase/server";
import { getHabits } from "@/lib/habits/get-habits";
import { countHabitsPendingToday } from "@/lib/habits/pending-today";
import { dueTodayOrOverdueFilter } from "@/lib/tasks/hoy-filter";

/**
 * Cuenta de la vista Hoy para el panel lateral (F1 del design de fase 1 y
 * el requirement "Contador de pendientes de Hoy solo cuenta tareas" del
 * spec de `vistas-lista`, ampliado en fase 3 para sumar hábitos, y en el
 * cambio `pendientes-en-el-icono-y-el-titulo` para compartir criterio con
 * el badge): tareas propias, pendientes, atrasadas o que vencen hoy, más
 * los hábitos pendientes de hoy (`lib/habits/pending-today.ts`, D-H de
 * `design.md`: este contador es un camino de código independiente del
 * badge del ícono, pero comparte con él la misma definición de
 * "pendiente").
 *
 * Usa `dueTodayOrOverdueFilter` (`lib/tasks/hoy-filter.ts`), el mismo
 * criterio de "atrasada o vence hoy" que usa también
 * `lib/pending-count/pending-today-count.ts` (badge del ícono y título):
 * si alguno de los dos deja de llamar a esa función, panel lateral e
 * ícono/título van a decir números distintos, que es el defecto que ese
 * cambio arregló.
 */
export async function getTodayTaskCount(userId: string, timezone: string): Promise<number> {
  const supabase = await createClient();
  const now = new Date();

  const [{ count }, habits] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("completed_at", null)
      .or(dueTodayOrOverdueFilter(now, timezone)),
    getHabits(userId, timezone, now),
  ]);

  return (count ?? 0) + countHabitsPendingToday(habits, timezone, now);
}
