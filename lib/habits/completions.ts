"use client";

import { useQuery, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Completados de un hábito por fecha exacta (defecto "un hábito marcado hoy
 * se pinta marcado en todos los días"): `habits.completed_today` es un solo
 * booleano por hábito, proyectado por la fecha de HOY (`habit-columns.ts`,
 * `.eq("habit_completions.completed_on", today)` en `use-habits.ts`), así
 * que el calendario —que dibuja varias ocurrencias del mismo hábito en días
 * distintos del rango visible— necesitaba leer `habit_completions` por
 * fecha, igual que ya hace `useHabitSkipsForRange` (`skips.ts`) con los
 * salteos. Mismo patrón: una sola consulta para todo el rango, agrupada
 * `fecha -> habit_id -> true`.
 */
const COMPLETIONS_QUERY_BASE = ["habits", "completions"] as const;

export type HabitCompletionsByDate = Record<string, Record<string, boolean>>;

export function habitCompletionsForRangeQueryKey(dates: string[]) {
  const datesKey = [...dates].sort().join(",");
  return [...COMPLETIONS_QUERY_BASE, "range", datesKey] as const;
}

/** Cualquier query de rango de completados, sin importar qué rango exacto de fechas tenga cada pantalla montada — mismo criterio que `isCalendarEventsQuery` en `lib/calendar/use-update-event.ts`. */
export function isHabitCompletionsRangeQuery(query: { queryKey: readonly unknown[] }): boolean {
  return query.queryKey[0] === COMPLETIONS_QUERY_BASE[0] && query.queryKey[1] === COMPLETIONS_QUERY_BASE[1] && query.queryKey[2] === "range";
}

/** Igual patrón que `useHabitSkipsForRange`: una sola consulta para todo el rango visible de la grilla en vez de una por día. */
export function useHabitCompletionsForRange(dates: string[]) {
  const supabase = createClient();

  return useQuery({
    queryKey: habitCompletionsForRangeQueryKey(dates),
    queryFn: async () => {
      if (dates.length === 0) return {} as HabitCompletionsByDate;
      const { data, error } = await supabase.from("habit_completions").select("habit_id, completed_on").in("completed_on", dates);
      if (error) throw error;
      const byDate: HabitCompletionsByDate = {};
      for (const row of data ?? []) {
        (byDate[row.completed_on] ??= {})[row.habit_id] = true;
      }
      return byDate;
    },
    enabled: dates.length > 0,
  });
}

/**
 * Parchea el mapa de completados por fecha en cualquier query de rango
 * activa (mismo criterio que `patchEventInCache` en
 * `lib/calendar/use-update-event.ts`): las mutaciones de marcar/desmarcar
 * (`mutations.ts`) no conocen el rango exacto de días que tiene montado
 * cada pantalla, así que parchean con un `predicate` en vez de una
 * `queryKey` fija.
 */
export function patchHabitCompletionInRangeCache(queryClient: QueryClient, habitId: string, date: string, completed: boolean) {
  queryClient.setQueriesData<HabitCompletionsByDate>({ predicate: isHabitCompletionsRangeQuery }, (old) => {
    if (!old) return old;
    if (completed) {
      return { ...old, [date]: { ...old[date], [habitId]: true } };
    }
    if (!old[date]) return old;
    const rest = Object.fromEntries(Object.entries(old[date]!).filter(([id]) => id !== habitId));
    return { ...old, [date]: rest };
  });
}
