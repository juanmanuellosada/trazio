// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Habit } from "@/lib/habits/habit-columns";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { HabitCard } from "./habit-card";

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
};

const mark = vi.fn();
const unmark = vi.fn();
const updateHabit = vi.fn();

vi.mock("@/lib/habits/mutations", () => ({
  useMarkHabitDone: () => ({ mutate: mark, isPending: false }),
  useUnmarkHabitDone: () => ({ mutate: unmark, isPending: false }),
  useUpdateHabit: () => ({ mutate: updateHabit, isPending: false }),
}));

const setOverride = vi.fn();
const removeOverride = vi.fn();

vi.mock("@/lib/habits/schedule-overrides", () => ({
  useHabitScheduleOverride: () => ({ data: null, isLoading: false }),
  useSetHabitScheduleOverride: () => ({ mutate: setOverride, isPending: false }),
  useRemoveHabitScheduleOverride: () => ({ mutate: removeOverride, isPending: false }),
}));

const TZ = "America/Argentina/Buenos_Aires";
const NOW = new Date("2026-07-31T15:00:00.000Z");
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

function renderCard(props: Partial<React.ComponentProps<typeof HabitCard>> = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <PreferencesProvider preferences={TEST_PREFERENCES}>
      <HabitCard
        habit={habit()}
        streak={{ currentStreak: 3, bestStreak: 5 }}
        completedDates={[]}
        dueToday
        timezone={TZ}
        now={NOW}
        todayDate={TODAY}
        onEdit={onEdit}
        onDelete={onDelete}
        {...props}
      />
    </PreferencesProvider>,
  );
  return { onEdit, onDelete };
}

describe("HabitCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no muestra casillero cuando el hábito no toca hoy (spec 'El casillero no aparece si el hábito no toca hoy')", () => {
    renderCard({ dueToday: false });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("marca el hábito de hoy al hacer clic en el casillero", async () => {
    const user = userEvent.setup();
    renderCard({ habit: habit({ completed_today: false }) });

    const checkbox = screen.getByRole("checkbox", { name: "Marcar Meditar como hecho hoy" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");

    await user.click(checkbox);
    expect(mark).toHaveBeenCalledWith({ habitId: "habit-1", date: TODAY, timezone: TZ });
    expect(unmark).not.toHaveBeenCalled();
  });

  it("desmarca el hábito de hoy al hacer clic si ya estaba marcado", async () => {
    const user = userEvent.setup();
    renderCard({ habit: habit({ completed_today: true }) });

    const checkbox = screen.getByRole("checkbox", { name: "Desmarcar Meditar de hoy" });
    expect(checkbox).toHaveAttribute("aria-checked", "true");

    await user.click(checkbox);
    expect(unmark).toHaveBeenCalledWith({ habitId: "habit-1", date: TODAY, timezone: TZ });
    expect(mark).not.toHaveBeenCalled();
  });

  it("un hábito diario muestra la racha actual en días, no progreso semanal", () => {
    renderCard({ habit: habit({ frequency_type: "daily" }), streak: { currentStreak: 3, bestStreak: 5 } });
    expect(screen.getByText("3 días")).toBeInTheDocument();
    expect(screen.getByText("Mejor: 5 días")).toBeInTheDocument();
  });

  it("un hábito de N veces por semana muestra progreso semanal en vez de racha en días", () => {
    renderCard({
      habit: habit({ frequency_type: "times_per_week", times_per_week: 3 }),
      completedDates: ["2026-07-27", "2026-07-29"],
      streak: { currentStreak: 2, bestStreak: 4 },
    });
    expect(screen.getByText("2 de 3")).toBeInTheDocument();
    expect(screen.queryByText("2 días")).not.toBeInTheDocument();
    // La mejor racha de este tipo se mide en semanas (D-C), no en días.
    expect(screen.getByText("Mejor: 4 semanas")).toBeInTheDocument();
  });

  it("el menú de acciones archiva, desarchiva y elimina sin ofrecer selección múltiple", async () => {
    const user = userEvent.setup();
    const { onEdit, onDelete } = renderCard({ habit: habit({ is_archived: false }) });

    await user.click(screen.getByRole("button", { name: "Más acciones de Meditar" }));
    await user.click(await screen.findByRole("menuitem", { name: "Editar" }));
    expect(onEdit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Más acciones de Meditar" }));
    await user.click(await screen.findByRole("menuitem", { name: "Archivar" }));
    expect(updateHabit).toHaveBeenCalledWith({ id: "habit-1", patch: { is_archived: true } });

    await user.click(screen.getByRole("button", { name: "Más acciones de Meditar" }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));
    expect(onDelete).toHaveBeenCalledTimes(1);

    expect(screen.queryByRole("checkbox", { name: /seleccionar/i })).not.toBeInTheDocument();
  });
});
