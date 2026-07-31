"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { todayInTimeZone } from "@/lib/dates/today";
import { HABIT_COLUMNS, toHabit, type HabitRawRow } from "./habit-columns";

export type { Habit, HabitFrequencyType } from "./habit-columns";

export function habitsQueryKey() {
  return ["habits"] as const;
}

/** RLS ya acota a los propios; el filtro embebido de `completed_on` es lo único que hace falta acá (ver `habit-columns.ts`). */
export async function fetchHabits(timezone: string) {
  const supabase = createClient();
  const today = todayInTimeZone(new Date(), timezone);
  const { data, error } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .eq("habit_completions.completed_on", today)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as HabitRawRow[]).map(toHabit);
}

/**
 * Todos los hábitos del usuario (tarea 2.1): patrón `initialData` +
 * TanStack Query, igual que `useHoyTasks`. `timezone` viaja como argumento
 * (no se lee acá de `user_preferences`) porque el llamador ya la tiene de
 * `getUserPreferences`/`useSettingsData`, mismo criterio que el resto de
 * `lib/tasks/`.
 */
export function useHabits(timezone: string, initialData?: Awaited<ReturnType<typeof fetchHabits>>) {
  return useQuery({
    queryKey: habitsQueryKey(),
    queryFn: () => fetchHabits(timezone),
    initialData,
  });
}
