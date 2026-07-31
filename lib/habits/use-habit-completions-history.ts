"use client";

import { format, parseISO, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { todayInTimeZone } from "@/lib/dates/today";
import { MINI_MAP_DAYS } from "./habit-history";
import type { HabitCompletionsHistory } from "./get-habit-completions-history";

export type { HabitCompletionsHistory } from "./get-habit-completions-history";

/**
 * Clave bajo el prefijo `["habits"]` (no una lista aparte): la invalidación
 * general que ya corre en cada mutación de hábitos (`mutations.ts`,
 * `onSettled: () => queryClient.invalidateQueries({ queryKey: ["habits"] })`)
 * y en los manejadores de realtime (`lib/realtime/handlers.ts`) alcanza
 * cualquier clave que empiece con `"habits"`, así que esta se refresca sola
 * sin un caso especial.
 */
export function habitCompletionsHistoryQueryKey() {
  return ["habits", "completions-history"] as const;
}

/** RLS ya acota a las propias filas del usuario; mismo rango de 14 días que `getHabitCompletionsHistory`. */
export async function fetchHabitCompletionsHistory(timezone: string): Promise<HabitCompletionsHistory> {
  const supabase = createClient();
  const today = todayInTimeZone(new Date(), timezone);
  const startDate = format(subDays(parseISO(today), MINI_MAP_DAYS - 1), "yyyy-MM-dd");

  const { data, error } = await supabase
    .from("habit_completions")
    .select("habit_id, completed_on")
    .gte("completed_on", startDate)
    .lte("completed_on", today);
  if (error) throw error;

  const history: HabitCompletionsHistory = {};
  for (const row of data ?? []) {
    (history[row.habit_id] ??= []).push(row.completed_on);
  }
  return history;
}

/**
 * Historial de 14 días para el mini-mapa (tarea 3.5) y el progreso semanal
 * (tarea 3.6): patrón `initialData` + TanStack Query, mismo criterio que
 * `useHabits`.
 */
export function useHabitCompletionsHistory(timezone: string, initialData?: HabitCompletionsHistory) {
  return useQuery({
    queryKey: habitCompletionsHistoryQueryKey(),
    queryFn: () => fetchHabitCompletionsHistory(timezone),
    initialData,
  });
}
