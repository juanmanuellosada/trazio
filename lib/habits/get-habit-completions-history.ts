import { format, parseISO, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { todayInTimeZone } from "@/lib/dates/today";
import { MINI_MAP_DAYS } from "./habit-history";

export type HabitCompletionsHistory = Record<string, string[]>;

/**
 * `completed_on` de cada hábito dentro de la ventana del mini-mapa de 14
 * días (tarea 3.5), en una sola consulta para todos los hábitos del
 * usuario en vez de una por hábito. El mismo rango alcanza también para el
 * progreso semanal de `times_per_week` (`currentWeekProgress` en
 * `habit-history.ts`): la semana en curso siempre cae dentro de los
 * últimos 7 días, ya incluidos acá.
 */
export async function getHabitCompletionsHistory(
  userId: string,
  timezone: string,
  now: Date,
): Promise<HabitCompletionsHistory> {
  const supabase = await createClient();
  const today = todayInTimeZone(now, timezone);
  const startDate = format(subDays(parseISO(today), MINI_MAP_DAYS - 1), "yyyy-MM-dd");

  const { data } = await supabase
    .from("habit_completions")
    .select("habit_id, completed_on")
    .eq("user_id", userId)
    .gte("completed_on", startDate)
    .lte("completed_on", today);

  const history: HabitCompletionsHistory = {};
  for (const row of data ?? []) {
    (history[row.habit_id] ??= []).push(row.completed_on);
  }
  return history;
}
