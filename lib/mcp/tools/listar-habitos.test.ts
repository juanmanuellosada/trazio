import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listarHabitos, listarHabitosInputSchema } from "./listar-habitos";

const NOW = new Date("2026-08-10T12:00:00Z");

function habitRow(id: string) {
  return {
    id,
    name: `Hábito ${id}`,
    icon: "star",
    color: "celeste",
    duration_minutes: 10,
    scheduled_time: null,
    frequency_type: "daily",
    times_per_week: null,
    days_of_week: null,
    is_archived: false,
  };
}

/**
 * Fake de `.from(tabla)` por tabla: `user_preferences` resuelve con
 * `.maybeSingle()`, `habits` con `.range()`, `habit_completions`/
 * `habit_skips` con `.in().eq()`. `rpc` (para `calcular_racha_habito`, vía
 * `getHabitStreak`) siempre devuelve la misma racha fija — no es lo que
 * este archivo prueba, `lib/habits/streak.ts` ya tiene la suya.
 */
function fakeSupabase(opts: { habits: unknown[]; completed?: string[]; skipped?: string[]; habitsRangeSpy?: ReturnType<typeof vi.fn> }) {
  const completed = opts.completed ?? [];
  const skipped = opts.skipped ?? [];
  const habitsRange = opts.habitsRangeSpy ?? vi.fn();
  habitsRange.mockResolvedValue({ data: opts.habits, error: null });

  const from = (table: string) => {
    if (table === "user_preferences") {
      return { select: () => ({ maybeSingle: () => Promise.resolve({ data: { timezone: "America/Argentina/Buenos_Aires" }, error: null }) }) };
    }
    if (table === "habits") {
      return { select: () => ({ order: () => ({ range: habitsRange }) }) };
    }
    if (table === "habit_completions") {
      return { select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: completed.map((habit_id) => ({ habit_id })), error: null }) }) }) };
    }
    if (table === "habit_skips") {
      return { select: () => ({ in: () => ({ eq: () => Promise.resolve({ data: skipped.map((habit_id) => ({ habit_id })), error: null }) }) }) };
    }
    throw new Error(`Tabla sin fake configurado: ${table}`);
  };

  const rpc = vi.fn().mockResolvedValue({ data: [{ current_streak: 3, best_streak: 5 }], error: null });

  return { from, rpc } as unknown as SupabaseClient<Database>;
}

describe("listarHabitos", () => {
  it("un hábito ya marcado hoy figura con estado 'done'", async () => {
    const supabase = fakeSupabase({ habits: [habitRow("h1")], completed: ["h1"] });
    const result = await listarHabitos(supabase, {}, NOW);
    expect(result.habits[0].status).toBe("done");
  });

  it("un hábito salteado hoy figura con estado 'skipped'", async () => {
    const supabase = fakeSupabase({ habits: [habitRow("h1")], skipped: ["h1"] });
    const result = await listarHabitos(supabase, {}, NOW);
    expect(result.habits[0].status).toBe("skipped");
  });

  it("sin marca ni salteo, queda 'pending'", async () => {
    const supabase = fakeSupabase({ habits: [habitRow("h1")] });
    const result = await listarHabitos(supabase, {}, NOW);
    expect(result.habits[0].status).toBe("pending");
  });

  it("trae la racha del RPC, no un cálculo propio", async () => {
    const supabase = fakeSupabase({ habits: [habitRow("h1")] });
    const result = await listarHabitos(supabase, {}, NOW);
    expect(result.habits[0].current_streak).toBe(3);
    expect(result.habits[0].best_streak).toBe(5);
  });

  it("nunca incluye constancia ni repeticiones (dependen de metricas-de-habitos, sin implementar)", async () => {
    const supabase = fakeSupabase({ habits: [habitRow("h1")] });
    const result = await listarHabitos(supabase, {}, NOW);
    expect(result.habits[0]).not.toHaveProperty("consistency");
    expect(result.habits[0]).not.toHaveProperty("repetitions");
  });

  it("un límite fuera de rango (negativo o absurdamente grande) se normaliza en vez de rechazarse", async () => {
    const rangeSpyNegative = vi.fn();
    const supabaseNegative = fakeSupabase({ habits: [], habitsRangeSpy: rangeSpyNegative });
    await listarHabitos(supabaseNegative, { limite: -5 }, NOW);
    expect(rangeSpyNegative).toHaveBeenCalledWith(0, 1);

    const rangeSpyHuge = vi.fn();
    const supabaseHuge = fakeSupabase({ habits: [], habitsRangeSpy: rangeSpyHuge });
    await listarHabitos(supabaseHuge, { limite: 999_999_999 }, NOW);
    expect(rangeSpyHuge).toHaveBeenCalledWith(0, 200);
  });

  it("un cursor con basura (no numérico o negativo) vuelve al offset 0 en vez de tirar", async () => {
    const rangeSpy = vi.fn();
    const supabase = fakeSupabase({ habits: [habitRow("h1")], habitsRangeSpy: rangeSpy });

    await listarHabitos(supabase, { cursor: "no-es-un-numero" }, NOW);
    expect(rangeSpy).toHaveBeenCalledWith(0, 50);

    await listarHabitos(supabase, { cursor: "-10" }, NOW);
    expect(rangeSpy).toHaveBeenCalledWith(0, 50);
  });

  it("el esquema de entrada acepta límite fuera de rango: la validación queda en manos de resolvePageSize, no del protocolo", () => {
    expect(listarHabitosInputSchema.safeParse({ limite: -5 }).success).toBe(true);
    expect(listarHabitosInputSchema.safeParse({ limite: 0 }).success).toBe(true);
    expect(listarHabitosInputSchema.safeParse({ limite: 10.5 }).success).toBe(true);
    expect(listarHabitosInputSchema.safeParse({ limite: 999_999_999 }).success).toBe(true);
  });
});
