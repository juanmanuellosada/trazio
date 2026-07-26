import { formatInTimeZone } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";

/**
 * Cuenta de la vista Hoy para el panel lateral (F1 del design de fase 1 y
 * el requirement "Contador de pendientes de Hoy solo cuenta tareas" del
 * spec de `vistas-lista`): tareas propias, pendientes, atrasadas o que
 * vencen hoy en la zona horaria del usuario. No suma hábitos: no existen
 * todavía (fase 3).
 *
 * `due_date` (sin hora) cuenta si es hoy o antes. `due_at` (con hora)
 * cuenta si cae hasta el final del día de hoy en la zona del usuario, lo
 * que cubre tanto "vence hoy" como "atrasada" sin correr la fecha (E5).
 */
export async function getTodayTaskCount(userId: string, timezone: string): Promise<number> {
  const supabase = await createClient();
  const now = new Date();
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const endOfTodayUtc = new Date(
    formatInTimeZone(now, timezone, "yyyy-MM-dd'T'23:59:59.999XXX"),
  ).toISOString();

  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("completed_at", null)
    .or(`due_date.lte.${today},due_at.lte.${endOfTodayUtc}`);

  return count ?? 0;
}
