import { dayBoundsUtc, todayInTimeZone } from "@/lib/dates/today";
import { createClient } from "@/lib/supabase/server";

/**
 * Cuenta de la vista Hoy para el panel lateral (F1 del design de fase 1 y
 * el requirement "Contador de pendientes de Hoy solo cuenta tareas" del
 * spec de `vistas-lista`): tareas propias, pendientes, atrasadas o que
 * vencen hoy en la zona horaria del usuario. No suma hábitos: no existen
 * todavía (fase 3).
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

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("completed_at", null)
    .or(`due_date.lte.${today},due_at.lte.${endUtc}`);

  return count ?? 0;
}
