"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { dataWindowChunks, isoWeekEnd } from "@/lib/dates/data-window";
import { HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY } from "./schedule-overrides";

type OverridesByDate = Record<string, Record<string, string>>;

/**
 * Overrides de varios días a la vez, agrupados por fecha (grupo 7 de fase 4,
 * "montar `CalendarView`"; pasado a trozos de semana ISO en la tarea 5.2,
 * `design.md` decisión 4): un pedido por cada semana ISO que cubre el rango
 * visible más el margen (`dataWindowChunks`), no un único pedido con el
 * rango exacto — mismo motivo que `useCalendarRangeEvents`, correrse un día
 * no vuelve a pedir los trozos que ya estaban en caché.
 * `useHabitScheduleOverridesForDate` sigue existiendo tal cual para la
 * tarjeta de `/habitos`, que solo necesita un día puntual.
 *
 * Mismo prefijo de `queryKey` que las mutaciones de `schedule-overrides.ts`
 * (`HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY`): así una reprogramación invalida
 * esta lectura igual que invalida al resto del módulo (`invalidateQueries`
 * matchea por prefijo, sin importar el trozo), sin tener que tocarlo.
 */
export function useHabitScheduleOverridesForRange(dates: string[]) {
  const supabase = createClient();
  const chunks = dataWindowChunks(dates);

  const queries = useQueries({
    queries: chunks.map((weekStart) => ({
      queryKey: [...HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY, "range", "chunk", weekStart] as const,
      queryFn: async (): Promise<OverridesByDate> => {
        const { data, error } = await supabase
          .from("habit_schedule_overrides")
          .select("habit_id, date, scheduled_time")
          .gte("date", weekStart)
          .lte("date", isoWeekEnd(weekStart));
        if (error) throw error;
        const byDate: OverridesByDate = {};
        for (const row of data ?? []) {
          (byDate[row.date] ??= {})[row.habit_id] = row.scheduled_time;
        }
        return byDate;
      },
    })),
  });

  const data = useMemo(() => {
    const merged: OverridesByDate = {};
    for (const query of queries) {
      for (const [date, byHabit] of Object.entries(query.data ?? {})) merged[date] = { ...merged[date], ...byHabit };
    }
    return merged;
  }, [queries]);

  return { data };
}
