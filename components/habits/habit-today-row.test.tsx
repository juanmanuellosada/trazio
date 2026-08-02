// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Habit } from "@/lib/habits/habit-columns";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { HabitTodayRow } from "./habit-today-row";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
  defaultProjectId: null,
};

function renderRow(ui: React.ReactElement) {
  return render(<PreferencesProvider preferences={TEST_PREFERENCES}>{ui}</PreferencesProvider>);
}

const mark = vi.fn();
const unmark = vi.fn();

vi.mock("@/lib/habits/mutations", () => ({
  useMarkHabitDone: () => ({ mutate: mark, isPending: false }),
  useUnmarkHabitDone: () => ({ mutate: unmark, isPending: false }),
}));

const TZ = "America/Argentina/Buenos_Aires";
const TODAY = "2026-07-31";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "habit-1",
    name: "Meditar",
    icon: "🧘",
    color: "celeste",
    duration_minutes: 15,
    scheduled_time: "07:00",
    frequency_type: "daily",
    times_per_week: null,
    days_of_week: null,
    is_archived: false,
    created_at: "2026-01-01T00:00:00.000Z",
    completed_today: false,
    ...overrides,
  };
}

describe("HabitTodayRow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca el hábito de hoy al hacer clic en el casillero, igual que en la pantalla propia", async () => {
    const user = userEvent.setup();
    renderRow(
      <HabitTodayRow habit={habit({ completed_today: false })} effectiveTime="07:00" todayDate={TODAY} timezone={TZ} />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Marcar Meditar como hecho hoy" });
    await user.click(checkbox);

    expect(mark).toHaveBeenCalledWith({ habitId: "habit-1", date: TODAY, timezone: TZ });
    expect(unmark).not.toHaveBeenCalled();
  });

  it("desmarca el hábito de hoy al hacer clic si ya estaba marcado", async () => {
    const user = userEvent.setup();
    renderRow(
      <HabitTodayRow habit={habit({ completed_today: true })} effectiveTime="07:00" todayDate={TODAY} timezone={TZ} />,
    );

    const checkbox = screen.getByRole("checkbox", { name: "Desmarcar Meditar de hoy" });
    await user.click(checkbox);

    expect(unmark).toHaveBeenCalledWith({ habitId: "habit-1", date: TODAY, timezone: TZ });
    expect(mark).not.toHaveBeenCalled();
  });

  it("no ofrece un casillero de selección: un hábito no es candidato de la selección múltiple", () => {
    renderRow(<HabitTodayRow habit={habit()} effectiveTime="07:00" todayDate={TODAY} timezone={TZ} />);
    expect(screen.queryByRole("checkbox", { name: /seleccionar/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });

  it("muestra 'Todo el día' cuando no hay hora efectiva", () => {
    renderRow(<HabitTodayRow habit={habit({ scheduled_time: null })} effectiveTime={null} todayDate={TODAY} timezone={TZ} />);
    expect(screen.getByText("Todo el día")).toBeInTheDocument();
  });

  it("muestra la hora efectiva (la del override de hoy), no la habitual del hábito", () => {
    renderRow(
      <HabitTodayRow habit={habit({ scheduled_time: "07:00" })} effectiveTime="19:00" todayDate={TODAY} timezone={TZ} />,
    );
    expect(screen.getByText("19:00")).toBeInTheDocument();
    expect(screen.queryByText("07:00")).not.toBeInTheDocument();
  });
});
