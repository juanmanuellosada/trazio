// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Habit } from "@/lib/habits/habit-columns";
import { HabitsView } from "./habits-view";

vi.mock("@/lib/habits/use-habits", () => ({
  useHabits: (_tz: string, initial: Habit[]) => ({ data: initial }),
}));
vi.mock("@/lib/habits/use-habit-completions-history", () => ({
  useHabitCompletionsHistory: (_tz: string, initial: unknown) => ({ data: initial }),
}));
vi.mock("@/lib/habits/use-habit-streaks", () => ({
  useHabitStreaks: () => ({ streaksById: {} }),
}));
// `HabitCard` tiene su propia suite (`habit-card.test.tsx`); acá interesa
// solo que `HabitsView` la invoque con los datos correctos por grupo.
vi.mock("./habit-card", () => ({
  HabitCard: ({ habit, dueToday }: { habit: Habit; dueToday: boolean }) => (
    <li>
      {habit.name}
      {dueToday ? " (hoy)" : ""}
    </li>
  ),
}));
vi.mock("./habit-form-dialog", () => ({ HabitFormDialog: () => null }));
vi.mock("./delete-habit-dialog", () => ({ DeleteHabitDialog: () => null }));

const TZ = "America/Argentina/Buenos_Aires";
const NOW_ISO = "2026-07-31T15:00:00.000Z"; // 2026-07-31 12:00 en TZ, viernes.
const TODAY = "2026-07-31";

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "h-1",
    name: "Hábito",
    icon: "🙂",
    color: "celeste",
    duration_minutes: 10,
    scheduled_time: null,
    frequency_type: "daily",
    times_per_week: null,
    days_of_week: null,
    is_archived: false,
    created_at: "2026-01-01T00:00:00.000Z",
    completed_today: false,
    ...overrides,
  };
}

function renderView(habits: Habit[]) {
  render(
    <HabitsView
      timezone={TZ}
      nowIso={NOW_ISO}
      todayDate={TODAY}
      initialHabits={habits}
      initialCompletionsHistory={{}}
      initialStreaks={{}}
    />,
  );
}

describe("HabitsView", () => {
  it("estado vacío cuando no hay hábitos", () => {
    renderView([]);
    expect(screen.getByText("Todavía no tenés hábitos.")).toBeInTheDocument();
  });

  it("agrupa los hábitos activos por forma de repetirse (spec 'Agrupación por forma de repetirse')", () => {
    renderView([
      habit({ id: "d1", name: "Diario", frequency_type: "daily" }),
      habit({ id: "w1", name: "Semanal", frequency_type: "times_per_week", times_per_week: 3 }),
      habit({ id: "s1", name: "Puntual", frequency_type: "specific_days", days_of_week: [1] }),
    ]);

    expect(screen.getByText("Todos los días")).toBeInTheDocument();
    expect(screen.getByText("Varias veces por semana")).toBeInTheDocument();
    expect(screen.getByText("Días específicos")).toBeInTheDocument();
    expect(screen.getByText(/Diario/)).toBeInTheDocument();
    expect(screen.getByText(/Semanal/)).toBeInTheDocument();
    expect(screen.getByText(/Puntual/)).toBeInTheDocument();
  });

  it("no muestra el encabezado de un grupo sin hábitos", () => {
    renderView([habit({ frequency_type: "daily" })]);
    expect(screen.queryByText("Varias veces por semana")).not.toBeInTheDocument();
    expect(screen.queryByText("Días específicos")).not.toBeInTheDocument();
  });

  it("el encabezado muestra los tres números (spec 'Encabezado con tres números')", () => {
    renderView([
      habit({ id: "1", frequency_type: "daily", completed_today: true }),
      habit({ id: "2", frequency_type: "daily", completed_today: false }),
    ]);

    expect(screen.getByText("Activos")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1 de 2")).toBeInTheDocument();
  });

  it("los archivados quedan en una sección desplegable, colapsada por defecto (spec 'Sección desplegable con los hábitos archivados')", async () => {
    const user = userEvent.setup();
    renderView([habit({ id: "a1", name: "Meditar", is_archived: true })]);

    expect(screen.queryByText("Meditar")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Archivados/ }));
    expect(screen.getByText("Meditar")).toBeInTheDocument();
  });

  it("no ofrece ningún modo de selección múltiple (spec 'La pantalla no ofrece selección múltiple')", () => {
    renderView([habit()]);
    expect(screen.queryByText(/seleccionar/i)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });
});
