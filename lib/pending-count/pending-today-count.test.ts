import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { dueTodayOrOverdueFilter } from "@/lib/tasks/hoy-filter";
import { countHabitsPendingToday, type PendingTodayHabit } from "@/lib/habits/pending-today";
import { fetchPendingTodayTaskCount } from "./pending-today-count";

const TZ = "America/Argentina/Buenos_Aires";
const NOW = new Date("2026-07-31T15:00:00.000Z");

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

function mockCountQuery(count: number) {
  const or = vi.fn(() => Promise.resolve({ count, error: null }));
  const is = vi.fn(() => ({ or }));
  (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn(() => ({ select: vi.fn(() => ({ is })) })),
  });
  return { or };
}

function habit(overrides: Partial<PendingTodayHabit> = {}): PendingTodayHabit {
  return {
    frequency_type: "daily",
    days_of_week: null,
    created_at: "2026-01-01T00:00:00.000Z",
    is_archived: false,
    completed_today: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Tarea 1.1/1.4: el conteo del cliente tiene que salir del mismo criterio
 * de "atrasada o vence hoy" que usa la vista Hoy (`dueTodayOrOverdueFilter`,
 * `lib/tasks/hoy-filter.ts`), no de uno escrito aparte — y el total tiene
 * que coincidir con el que arma `lib/tasks/today-count.ts` para el panel
 * lateral, incluidas las atrasadas.
 */
describe("fetchPendingTodayTaskCount", () => {
  it("pide a la base exactamente el filtro de dueTodayOrOverdueFilter, sin reescribirlo", async () => {
    const { or } = mockCountQuery(3);

    await fetchPendingTodayTaskCount(TZ);

    expect(or).toHaveBeenCalledWith(dueTodayOrOverdueFilter(NOW, TZ));
  });

  it("el total (tareas + hábitos pendientes) coincide con el que arma today-count.ts para el mismo conjunto de datos", async () => {
    mockCountQuery(2); // dos tareas atrasadas o de hoy, sin completar.
    const habits = [habit(), habit({ completed_today: true }), habit()]; // dos hábitos pendientes de tres.

    const taskCount = await fetchPendingTodayTaskCount(TZ);
    const total = taskCount + countHabitsPendingToday(habits, TZ, NOW);

    // Misma cuenta que `getTodayTaskCount` (servidor): `(count ?? 0) + countHabitsPendingToday(...)`.
    expect(total).toBe(4);
  });
});
