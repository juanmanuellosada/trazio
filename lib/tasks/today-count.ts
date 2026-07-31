import { dayBoundsUtc, todayInTimeZone } from "@/lib/dates/today";
import { createClient } from "@/lib/supabase/server";
import { getHabits } from "@/lib/habits/get-habits";
import { countHabitsPendingToday } from "@/lib/habits/pending-today";

/**
 * Cuenta de la vista Hoy para el panel lateral (F1 del design de fase 1 y
 * el requirement "Contador de pendientes de Hoy solo cuenta tareas" del
 * spec de `vistas-lista`, ampliado en fase 3 para sumar hábitos): tareas
 * propias, pendientes, atrasadas o que vencen hoy, más los hábitos
 * pendientes de hoy (`lib/habits/pending-today.ts`, D-H de `design.md`:
 * este contador es un camino de código independiente del badge del ícono,
 * pero comparte con él la misma definición de "pendiente").
 *
 * Usa los mismos límites de día que `lib/tasks/hoy-filter.ts` (la consulta
 * detrás de la vista Hoy, bloque 8.2): mismo criterio de "atrasada o vence
 * hoy" en los dos lugares, para que el número del panel lateral nunca
 * diverja de lo que la vista realmente muestra (8.3).
 */
export async function getTodayTaskCount(userId: string, timezone: string): Promise<number> {
  const supabase = await createClient();
  const now = new Date();
  const today = todayInTimeZone(now, timezone);
  const { endUtc } = dayBoundsUtc(now, timezone);

  const [{ count }, habits] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("completed_at", null)
      .or(`due_date.lte.${today},due_at.lte.${endUtc}`),
    getHabits(userId, timezone, now),
  ]);

  return (count ?? 0) + countHabitsPendingToday(habits, timezone, now);
}
