"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { dueTodayOrOverdueFilter } from "@/lib/tasks/hoy-filter";
import { fetchHabits, habitsQueryKey } from "@/lib/habits/use-habits";
import { countHabitsPendingToday } from "@/lib/habits/pending-today";
import { useUserPreferences } from "@/components/providers/preferences-provider";

export function pendingTodayTaskCountQueryKey() {
  return ["tasks", "pending-today-count"] as const;
}

/**
 * Tareas propias sin completar que vencen hoy o están atrasadas, contadas
 * desde el cliente. Usa `dueTodayOrOverdueFilter` (`lib/tasks/hoy-filter.ts`)
 * en vez de escribir el criterio de "atrasada o vence hoy" una tercera vez
 * (el servidor ya lo escribe una vez en `hoy-filter.ts` y lo usa en
 * `lib/tasks/today-count.ts`). Sin `.eq("user_id", ...)` explícito: RLS ya
 * acota a los propios (mismo criterio que `lib/habits/use-habits.ts`).
 */
export async function fetchPendingTodayTaskCount(timezone: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .is("completed_at", null)
    .or(dueTodayOrOverdueFilter(new Date(), timezone));
  if (error) throw error;
  return count ?? 0;
}

/**
 * Pendientes del día para el badge del ícono y el título del documento
 * (spec "Badge del ícono con los pendientes del día", cambio
 * `pendientes-en-el-icono-y-el-titulo`): tareas atrasadas o que vencen hoy,
 * más hábitos pendientes de hoy (`lib/habits/pending-today.ts`, D-H de
 * `design.md` de fase 3). Mismo conjunto que `lib/tasks/today-count.ts`
 * (panel lateral) — si los criterios se separan, panel lateral e
 * ícono/título van a decir números distintos, que es exactamente el
 * defecto que este módulo vino a arreglar. La query de hábitos usa
 * `habitsQueryKey()`, la misma clave que `useHabits`, para compartir caché
 * con el resto de la app en vez de duplicar el fetch.
 */
export function usePendingTodayCount(): number | undefined {
  const { timezone } = useUserPreferences();
  const { data: taskCount } = useQuery({
    queryKey: pendingTodayTaskCountQueryKey(),
    queryFn: () => fetchPendingTodayTaskCount(timezone),
    refetchInterval: 60_000,
  });
  const { data: habits } = useQuery({
    queryKey: habitsQueryKey(),
    queryFn: () => fetchHabits(timezone),
    refetchInterval: 60_000,
  });

  if (taskCount === undefined || habits === undefined) return undefined;
  return taskCount + countHabitsPendingToday(habits, timezone, new Date());
}
