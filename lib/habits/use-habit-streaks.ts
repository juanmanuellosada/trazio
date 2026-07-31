"use client";

import { useQueries } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getHabitStreak, type HabitStreak } from "./streak";

export function habitStreakQueryKey(habitId: string) {
  return ["habits", "streak", habitId] as const;
}

export type HabitStreaksById = Record<string, HabitStreak>;

/**
 * Racha de cada hábito en paralelo (tareas 3.6/3.7, encabezado de la tarea
 * 3.2): una consulta por hábito bajo `["habits", "streak", id]`, para que
 * la invalidación general de `["habits"]` que ya corre en cada mutación
 * (`mutations.ts`) y en los manejadores de realtime
 * (`lib/realtime/handlers.ts`) alcance a todas sin un caso especial —
 * mismo razonamiento que `use-habit-completions-history.ts`.
 *
 * `now` viaja explícito (nunca `new Date()` implícito), igual que el resto
 * del bloque 2, para que el primer render del cliente no diverja del
 * cálculo hecho en el servidor.
 */
export function useHabitStreaks(habitIds: readonly string[], now: Date, initialData?: HabitStreaksById) {
  const supabase = createClient();

  return useQueries({
    queries: habitIds.map((id) => ({
      queryKey: habitStreakQueryKey(id),
      queryFn: () => getHabitStreak(supabase, id, now),
      initialData: initialData?.[id],
    })),
    combine: (results) => ({
      streaksById: Object.fromEntries(habitIds.map((id, i) => [id, results[i].data])) as HabitStreaksById,
      isLoading: results.some((r) => r.isLoading),
    }),
  });
}
