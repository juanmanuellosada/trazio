"use client";

import { useMemo } from "react";
import { useQueries, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { dataWindowChunks, isoWeekEnd } from "@/lib/dates/data-window";

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

/** Clave de un trozo de semana ISO (tarea 5.2, `design.md` decisión 4): mismo formato de marcador (`"range"`) que antes usaba el rango completo, para que `isHabitCompletionsRangeQuery` siga reconociéndolo sin cambios. */
export function habitCompletionsChunkQueryKey(weekStart: string) {
  return [...COMPLETIONS_QUERY_BASE, "range", "chunk", weekStart] as const;
}

/** Cualquier query de rango de completados, sin importar qué trozo exacto tenga cada pantalla montado — mismo criterio que `isCalendarEventsQuery` en `lib/calendar/use-update-event.ts`. */
export function isHabitCompletionsRangeQuery(query: { queryKey: readonly unknown[] }): boolean {
  return query.queryKey[0] === COMPLETIONS_QUERY_BASE[0] && query.queryKey[1] === COMPLETIONS_QUERY_BASE[1] && query.queryKey[2] === "range";
}

/**
 * Pasado a trozos de semana ISO en la tarea 5.2 (`design.md` decisión 4):
 * un pedido por cada semana ISO que cubre el rango visible más el margen
 * (`dataWindowChunks`), mismo criterio que `useHabitSkipsForRange` —
 * correrse un día reutiliza los trozos que ya estaban en caché en vez de
 * volver a pedir todo bajo una `queryKey` que cambiaba con el rango exacto.
 */
export function useHabitCompletionsForRange(dates: string[]) {
  const supabase = createClient();
  const chunks = dataWindowChunks(dates);

  const queries = useQueries({
    queries: chunks.map((weekStart) => ({
      queryKey: habitCompletionsChunkQueryKey(weekStart),
      queryFn: async (): Promise<HabitCompletionsByDate> => {
        const { data, error } = await supabase
          .from("habit_completions")
          .select("habit_id, completed_on")
          .gte("completed_on", weekStart)
          .lte("completed_on", isoWeekEnd(weekStart));
        if (error) throw error;
        const byDate: HabitCompletionsByDate = {};
        for (const row of data ?? []) {
          (byDate[row.completed_on] ??= {})[row.habit_id] = true;
        }
        return byDate;
      },
    })),
  });

  const data = useMemo(() => {
    const merged: HabitCompletionsByDate = {};
    for (const query of queries) {
      for (const [date, byHabit] of Object.entries(query.data ?? {})) merged[date] = { ...merged[date], ...byHabit };
    }
    return merged;
  }, [queries]);

  return { data };
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
