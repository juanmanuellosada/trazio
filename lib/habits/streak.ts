import type { SupabaseClient } from "@supabase/supabase-js";

export type HabitStreak = { currentStreak: number; bestStreak: number };

/**
 * Racha actual y mejor racha de un hábito (tarea 2.7, D-B/D10): siempre por
 * RPC a `calcular_racha_habito` (migración
 * `20260729180000_calcular_racha_habito.sql`), nunca reimplementada acá —
 * esa función es la única fuente de verdad de las reglas de racha (D-C).
 *
 * Recibe el `supabase` ya creado (mismo criterio que
 * `lib/tasks/duplicate.ts`/`restore.ts`) para poder llamarse tanto desde el
 * Server Component de `/habitos` como desde un hook de TanStack Query en el
 * cliente, sin duplicar esta función por lado. `at` viaja explícito y
 * opcional: sin él, la función SQL usa `now()`; los tests fijan un instante
 * exacto, igual que `buscar_tareas`.
 */
export async function getHabitStreak(
  supabase: SupabaseClient,
  habitId: string,
  at?: Date,
): Promise<HabitStreak> {
  const { data, error } = await supabase.rpc("calcular_racha_habito", {
    p_habit_id: habitId,
    ...(at ? { at: at.toISOString() } : {}),
  });
  if (error) throw error;

  const row = (data as { current_streak: number; best_streak: number }[] | null)?.[0];
  return { currentStreak: row?.current_streak ?? 0, bestStreak: row?.best_streak ?? 0 };
}
