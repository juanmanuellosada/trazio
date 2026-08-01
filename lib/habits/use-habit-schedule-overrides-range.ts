"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY } from "./schedule-overrides";

/**
 * Overrides de varios días a la vez, agrupados por fecha (grupo 7 de fase 4,
 * "montar `CalendarView`"): una sola consulta para todo el rango visible de
 * la grilla (semana/mes) en vez de una por día. `useHabitScheduleOverridesForDate`
 * sigue existiendo tal cual para la tarjeta de `/habitos`, que solo necesita
 * un día puntual.
 *
 * Mismo prefijo de `queryKey` que las mutaciones de `schedule-overrides.ts`
 * (`HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY`, ya exportado ahí): así una
 * reprogramación invalida esta lectura igual que invalida al resto del
 * módulo, sin tener que tocarlo.
 */
export function useHabitScheduleOverridesForRange(dates: string[]) {
  const supabase = createClient();
  const datesKey = [...dates].sort().join(",");

  return useQuery({
    queryKey: [...HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY, "range", datesKey] as const,
    queryFn: async () => {
      if (dates.length === 0) return {} as Record<string, Record<string, string>>;
      const { data, error } = await supabase.from("habit_schedule_overrides").select("habit_id, date, scheduled_time").in("date", dates);
      if (error) throw error;
      const byDate: Record<string, Record<string, string>> = {};
      for (const row of data ?? []) {
        (byDate[row.date] ??= {})[row.habit_id] = row.scheduled_time;
      }
      return byDate;
    },
    enabled: dates.length > 0,
  });
}
