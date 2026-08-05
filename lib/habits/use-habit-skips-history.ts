"use client";

import { format, parseISO, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { todayInTimeZone } from "@/lib/dates/today";
import { MINI_MAP_DAYS } from "./habit-history";
import { HABIT_SKIPS_MUTATION_KEY } from "./skips";
import type { HabitSkipsHistory } from "./get-habit-skips-history";

export type { HabitSkipsHistory } from "./get-habit-skips-history";

/**
 * Clave bajo el prefijo `["habits", "skips"]`: comparte invalidación con
 * `useSkipHabit`/`useUnskipHabit` (`skips.ts`) sin caso especial — mismo
 * criterio que `habitCompletionsHistoryQueryKey` bajo `["habits"]`.
 */
export function habitSkipsHistoryQueryKey() {
  return [...HABIT_SKIPS_MUTATION_KEY, "history"] as const;
}

/** RLS ya acota a las propias filas del usuario; mismo rango de 14 días que `getHabitSkipsHistory`. */
export async function fetchHabitSkipsHistory(timezone: string): Promise<HabitSkipsHistory> {
  const supabase = createClient();
  const today = todayInTimeZone(new Date(), timezone);
  const startDate = format(subDays(parseISO(today), MINI_MAP_DAYS - 1), "yyyy-MM-dd");

  const { data, error } = await supabase.from("habit_skips").select("habit_id, date").gte("date", startDate).lte("date", today);
  if (error) throw error;

  const history: HabitSkipsHistory = {};
  for (const row of data ?? []) {
    (history[row.habit_id] ??= []).push(row.date);
  }
  return history;
}

/** Historial de salteos de 14 días para el mini-mapa, mismo patrón que `useHabitCompletionsHistory`. */
export function useHabitSkipsHistory(timezone: string, initialData?: HabitSkipsHistory) {
  return useQuery({
    queryKey: habitSkipsHistoryQueryKey(),
    queryFn: () => fetchHabitSkipsHistory(timezone),
    initialData,
  });
}
