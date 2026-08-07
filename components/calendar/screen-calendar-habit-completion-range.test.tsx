// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultOptionsForViewKey } from "@/lib/view-options/schema";
import type { Habit } from "@/lib/habits/habit-columns";
import { ScreenCalendar } from "./screen-calendar";

/**
 * Defecto "un hábito marcado hoy se pinta marcado en todos los días": antes
 * `habitToCalendarBlock` leía `habit.completed_today` (un único booleano por
 * hábito) para CADA ocurrencia del rango visible, así que marcar un hábito
 * un día lo pintaba cumplido en todos los demás días de la semana también.
 * Este test renderiza una semana completa con un hábito diario y un
 * completado que solo existe para UNO de esos siete días
 * (`useHabitCompletionsForRange`, mockeado más abajo): si el defecto
 * reaparece, más de un casillero aparece marcado.
 */

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/tasks/mutations", () => ({ useUpdateTask: () => ({ mutate: vi.fn() }), useDeleteTask: () => ({ mutate: vi.fn() }) }));
vi.mock("@/components/tasks/task-detail-context", () => ({ useTaskDetail: () => ({ open: vi.fn(), close: vi.fn() }) }));
vi.mock("@/lib/calendar/use-calendar-range-events", () => ({
  useCalendarRangeEvents: () => ({ data: { status: "ok", events: [] } }),
}));
vi.mock("@/lib/calendar/use-update-event", () => ({ useUpdateEvent: () => ({ mutate: vi.fn() }) }));
vi.mock("@/lib/habits/use-habit-schedule-overrides-range", () => ({ useHabitScheduleOverridesForRange: () => ({ data: {} }) }));
vi.mock("@/lib/habits/schedule-overrides", () => ({ useSetHabitScheduleOverride: () => ({ mutate: vi.fn() }) }));
vi.mock("@/lib/habits/skips", () => ({ useSkipHabit: () => ({ mutate: vi.fn() }), useHabitSkipsForRange: () => ({ data: {} }) }));
vi.mock("@/lib/habits/mutations", () => ({
  useMarkHabitDone: () => ({ mutate: vi.fn() }),
  useUnmarkHabitDone: () => ({ mutate: vi.fn() }),
  useUpdateHabit: () => ({ mutate: vi.fn() }),
}));

// Solo el 2026-08-05 (miércoles, dentro de la semana del 2026-08-05 con
// `weekStartsOn: 1`) tiene una marca: los otros seis días de la semana no.
vi.mock("@/lib/habits/completions", () => ({
  useHabitCompletionsForRange: () => ({ data: { "2026-08-05": { "habit-1": true } } }),
}));

const HABIT: Habit = {
  id: "habit-1",
  name: "Meditar",
  icon: "🧘",
  color: "azul",
  duration_minutes: 30,
  scheduled_time: "09:00:00",
  frequency_type: "daily",
  times_per_week: null,
  days_of_week: null,
  is_archived: false,
  created_at: "2026-07-01T00:00:00.000Z",
  completed_today: false,
};

vi.mock("@/lib/habits/use-habits", () => ({ useHabits: () => ({ data: [HABIT] }) }));

const NOW = new Date("2026-08-05T12:00:00-03:00");

function renderScreenCalendar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const options = { ...defaultOptionsForViewKey("bandeja"), viewShape: "calendario" as const, formato_calendario: "semana" as const };
  return render(
    <QueryClientProvider client={queryClient}>
      <ScreenCalendar
        timezone="America/Argentina/Buenos_Aires"
        weekStartsOn={1}
        timeFormat={24}
        options={options}
        tasks={[]}
        resolveTaskColor={() => "#0284C7"}
        createTaskProjectId="project-1"
      />
    </QueryClientProvider>,
  );
}

describe("ScreenCalendar — completado por fecha, no por hábito (defecto de pintado)", () => {
  beforeEach(() => {
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("un hábito diario marcado un solo día de la semana se ve marcado solo ese día", async () => {
    renderScreenCalendar();
    const checkboxes = await screen.findAllByRole("checkbox", { name: /Meditar/ });
    // Un hábito diario, siete días visibles: una ocurrencia por día.
    expect(checkboxes).toHaveLength(7);

    const checked = checkboxes.filter((checkbox) => checkbox.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
  });
});
