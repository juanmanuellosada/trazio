// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultOptionsForViewKey, type ViewOptions } from "@/lib/view-options/schema";
import type { Habit } from "@/lib/habits/habit-columns";
import { ScreenCalendar } from "./screen-calendar";

/**
 * `completadas-oculta-tambien-los-habitos` (D-A, spec `vista-calendario`,
 * "Un bloque de hábito completado responde al control de completadas"): con
 * el control apagado, un hábito ya marcado ese día no se dibuja, pero uno
 * salteado (D50) sí — es el caso que distingue este cambio de "ocultar todo
 * lo que no está pendiente".
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
vi.mock("@/lib/habits/skips", () => ({
  useSkipHabit: () => ({ mutate: vi.fn() }),
  useHabitSkipsForRange: () => ({ data: { "2026-08-05": { "habit-skipped": true } } }),
}));
vi.mock("@/lib/habits/mutations", () => ({
  useMarkHabitDone: () => ({ mutate: vi.fn() }),
  useUnmarkHabitDone: () => ({ mutate: vi.fn() }),
  useUpdateHabit: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/lib/habits/completions", () => ({
  useHabitCompletionsForRange: () => ({ data: { "2026-08-05": { "habit-completed": true } } }),
}));

function habit(overrides: Partial<Habit>): Habit {
  return {
    id: "habit-id",
    name: "Hábito",
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
    ...overrides,
  };
}

const HABITS: Habit[] = [
  habit({ id: "habit-completed", name: "Meditar" }),
  habit({ id: "habit-skipped", name: "Correr" }),
  habit({ id: "habit-pending", name: "Leer" }),
];

vi.mock("@/lib/habits/use-habits", () => ({ useHabits: () => ({ data: HABITS }) }));

const NOW = new Date("2026-08-05T12:00:00-03:00");

function renderScreenCalendar(showCompleted: boolean) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const options: ViewOptions = {
    ...defaultOptionsForViewKey("bandeja"),
    viewShape: "calendario",
    formato_calendario: "dia",
    showCompleted,
  };
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

describe("ScreenCalendar — el control de completadas también oculta hábitos", () => {
  beforeEach(() => {
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("con las completadas apagadas, un hábito ya marcado no se dibuja", async () => {
    renderScreenCalendar(false);
    expect(await screen.findAllByRole("checkbox", { name: /Correr/ })).toHaveLength(1);
    expect(screen.queryAllByRole("checkbox", { name: /Meditar/ })).toHaveLength(0);
  });

  it("con las completadas apagadas, un hábito salteado sigue dibujándose", async () => {
    renderScreenCalendar(false);
    const checkboxes = await screen.findAllByRole("checkbox", { name: /Correr/ });
    expect(checkboxes).toHaveLength(1);
  });

  it("con las completadas apagadas, un hábito pendiente sigue dibujándose", async () => {
    renderScreenCalendar(false);
    expect(await screen.findAllByRole("checkbox", { name: /Leer/ })).toHaveLength(1);
  });

  it("con las completadas prendidas, los tres hábitos se dibujan", async () => {
    renderScreenCalendar(true);
    expect(await screen.findAllByRole("checkbox", { name: /Meditar/ })).toHaveLength(1);
    expect(screen.queryAllByRole("checkbox", { name: /Correr/ })).toHaveLength(1);
    expect(screen.queryAllByRole("checkbox", { name: /Leer/ })).toHaveLength(1);
  });
});
