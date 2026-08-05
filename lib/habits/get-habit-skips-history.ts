import { format, parseISO, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { todayInTimeZone } from "@/lib/dates/today";
import { MINI_MAP_DAYS } from "./habit-history";

export type HabitSkipsHistory = Record<string, string[]>;

/**
 * `date` de `habit_skips` dentro de la ventana del mini-mapa de 14 días
 * (spec "Un día salteado se distingue de uno sin hacer" de
 * `calendario-legible-y-manipulable`), mismo rango y misma forma que
 * `getHabitCompletionsHistory` — una sola consulta para todos los hábitos
 * del usuario en vez de una por hábito.
 */
export async function getHabitSkipsHistory(userId: string, timezone: string, now: Date): Promise<HabitSkipsHistory> {
  const supabase = await createClient();
  const today = todayInTimeZone(now, timezone);
  const startDate = format(subDays(parseISO(today), MINI_MAP_DAYS - 1), "yyyy-MM-dd");

  const { data } = await supabase
    .from("habit_skips")
    .select("habit_id, date")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", today);

  const history: HabitSkipsHistory = {};
  for (const row of data ?? []) {
    (history[row.habit_id] ??= []).push(row.date);
  }
  return history;
}
