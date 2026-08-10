import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { todayInTimeZone } from "@/lib/dates/today";
import { resolveHabitDayStatus, type HabitDayStatus } from "@/lib/habits/day-status";
import { getHabitStreak } from "@/lib/habits/streak";
import { buildPage, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, resolveOffset, resolvePageSize } from "../pagination";

/**
 * `limite` sin `.int().positive()`: mismo motivo que en
 * `listar-estructura.ts` — el esquema se limita a la forma del dato y deja
 * que `resolvePageSize` normalice límites fuera de rango.
 */
export const listarHabitosInputSchema = z.object({
  cursor: z
    .string()
    .optional()
    .describe("Token de paginación: el next_cursor de la respuesta anterior. Omitir en la primera página."),
  limite: z
    .number()
    .optional()
    .describe(`Hábitos por página, de 1 a ${MAX_PAGE_SIZE} (default ${DEFAULT_PAGE_SIZE}).`),
});
export type ListarHabitosInput = z.infer<typeof listarHabitosInputSchema>;

/**
 * Sin `consistency` ni `repetitions`: el spec de `mcp` pide también
 * constancia y repeticiones, pero esos cálculos son del change
 * `metricas-de-habitos` — propuesto, todavía sin implementar. Devolver solo
 * lo que existe hoy (racha actual y mejor racha, `calcular_racha_habito`) y
 * sumar el resto cuando ese change se implemente evita duplicar el cálculo
 * acá y que las dos versiones se desincronicen (ver `tasks.md`, Ola 6).
 */
export type McpHabit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  duration_minutes: number;
  scheduled_time: string | null;
  frequency_type: string;
  times_per_week: number | null;
  days_of_week: number[] | null;
  is_archived: boolean;
  status: HabitDayStatus;
  current_streak: number;
  best_streak: number;
};

export type ListarHabitosResult = { habits: McpHabit[]; truncated: boolean; next_cursor: string | null };

type RawHabitRow = Omit<McpHabit, "status" | "current_streak" | "best_streak">;

const HABIT_COLUMNS =
  "id, name, icon, color, duration_minutes, scheduled_time, frequency_type, times_per_week, days_of_week, is_archived";

/**
 * `listar_habitos` (spec `mcp`): hábitos con su estado del día (pendiente,
 * hecho, salteado — `resolveHabitDayStatus`, mismo criterio que
 * `pantalla-habitos`) y su racha (`calcular_racha_habito` vía
 * `getHabitStreak`, nunca reimplementada acá). `now` viaja explícito
 * (default `new Date()` solo para el caso real) para que los tests fijen un
 * instante exacto, mismo principio que el resto del bloque de hábitos.
 */
export async function listarHabitos(
  supabase: SupabaseClient<Database>,
  input: ListarHabitosInput,
  now: Date = new Date(),
): Promise<ListarHabitosResult> {
  const pageSize = resolvePageSize(input.limite);
  const offset = resolveOffset(input.cursor);

  const { data: prefRow } = await supabase.from("user_preferences").select("timezone").maybeSingle();
  const timezone = (prefRow as { timezone: string } | null)?.timezone ?? "America/Argentina/Buenos_Aires";
  const today = todayInTimeZone(now, timezone);

  const { data: habitRows, error } = await supabase
    .from("habits")
    .select(HABIT_COLUMNS)
    .order("id", { ascending: true })
    .range(offset, offset + pageSize);
  if (error) throw error;

  const page = buildPage((habitRows ?? []) as RawHabitRow[], offset, pageSize);
  const ids = page.items.map((h) => h.id);

  const [completedRes, skippedRes] = await Promise.all([
    ids.length
      ? supabase.from("habit_completions").select("habit_id").in("habit_id", ids).eq("completed_on", today)
      : Promise.resolve({ data: [] as { habit_id: string }[], error: null }),
    ids.length
      ? supabase.from("habit_skips").select("habit_id").in("habit_id", ids).eq("date", today)
      : Promise.resolve({ data: [] as { habit_id: string }[], error: null }),
  ]);
  if (completedRes.error) throw completedRes.error;
  if (skippedRes.error) throw skippedRes.error;

  const completedIds = new Set((completedRes.data ?? []).map((r) => r.habit_id));
  const skippedIds = new Set((skippedRes.data ?? []).map((r) => r.habit_id));

  const habits = await Promise.all(
    page.items.map(async (habit): Promise<McpHabit> => {
      const streak = await getHabitStreak(supabase, habit.id, now);
      return {
        ...habit,
        status: resolveHabitDayStatus(completedIds.has(habit.id), skippedIds.has(habit.id)),
        current_streak: streak.currentStreak,
        best_streak: streak.bestStreak,
      };
    }),
  );

  return { habits, truncated: page.truncated, next_cursor: page.nextCursor };
}
