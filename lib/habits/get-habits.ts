import { createClient } from "@/lib/supabase/server";
import { todayInTimeZone } from "@/lib/dates/today";
import { HABIT_COLUMNS, toHabit, type Habit, type HabitRawRow } from "./habit-columns";

/**
 * Todos los hábitos del usuario (tarea 2.1), para sembrar el caché de
 * TanStack Query de `useHabits` desde el Server Component de `/habitos` y
 * el bloque de Hoy — mismo patrón `initialData` que `getHoyTasks`. `now`
 * viaja explícito para que el primer render del cliente use el mismo
 * instante que el servidor y `completed_today` no diverja por el paso del
 * reloj entre uno y otro.
 */
export async function getHabits(userId: string, timezone: string, now: Date): Promise<Habit[]> {
  const supabase = await createClient();
  const today = todayInTimeZone(now, timezone);
  const { data } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .eq("user_id", userId)
    .eq("habit_completions.completed_on", today)
    .order("created_at", { ascending: true });

  return ((data ?? []) as unknown as HabitRawRow[]).map(toHabit);
}
