// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Habit } from "@/lib/habits/habit-columns";
import { HabitsTodayBlock } from "./habits-today-block";

vi.mock("@/lib/habits/use-habits", () => ({
  useHabits: (_tz: string, initial: Habit[]) => ({ data: initial }),
}));

let overridesByHabitId: Record<string, string> = {};

vi.mock("@/lib/habits/schedule-overrides", () => ({
  useHabitScheduleOverridesForDate: () => ({ data: overridesByHabitId }),
}));

// `HabitTodayRow` tiene su propia suite (`habit-today-row.test.tsx`); acá
// interesa solo el orden, el contador y la hora efectiva que le pasa este
// bloque.
vi.mock("./habit-today-row", () => ({
  HabitTodayRow: ({ habit, effectiveTime }: { habit: Habit; effectiveTime: string | null }) => (
    <li>
      {habit.name} — {effectiveTime ?? "todo el día"}
    </li>
  ),
}));

const TZ = "America/Argentina/Buenos_Aires";
const NOW = new Date("2026-07-31T15:00:00.000Z"); // 2026-07-31 12:00 en BA, viernes.
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

function renderBlock(habits: Habit[], showCompleted = true) {
  return render(<HabitsTodayBlock timezone={TZ} now={NOW} todayDate={TODAY} initialHabits={habits} showCompleted={showCompleted} />);
}

describe("HabitsTodayBlock", () => {
  beforeEach(() => {
    overridesByHabitId = {};
  });

  it("no renderiza nada si ningún hábito toca hoy", () => {
    // Días específicos con solo lunes: hoy es viernes, no le toca.
    const { container } = renderBlock([habit({ frequency_type: "specific_days", days_of_week: [1] })]);
    expect(container).toBeEmptyDOMElement();
  });

  it("no renderiza nada si no hay hábitos", () => {
    const { container } = renderBlock([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el contador de cuántos hábitos de hoy se marcaron (spec 'contador de hábitos')", () => {
    renderBlock([
      habit({ id: "1", name: "Meditar", completed_today: true }),
      habit({ id: "2", name: "Leer", completed_today: false }),
    ]);
    expect(screen.getByText("Hábitos de hoy (1 de 2)")).toBeInTheDocument();
  });

  it("ordena los hábitos por horario, y los sin horario al final (D25)", () => {
    renderBlock([
      habit({ id: "1", name: "Sin horario", scheduled_time: null }),
      habit({ id: "2", name: "Tarde", scheduled_time: "18:00" }),
      habit({ id: "3", name: "Mañana", scheduled_time: "07:00" }),
    ]);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Mañana — 07:00", "Tarde — 18:00", "Sin horario — todo el día"]);
  });

  it("no incluye un hábito archivado (D-F: desaparece de Hoy)", () => {
    renderBlock([habit({ is_archived: true })]);
    expect(screen.queryByText("Hábito", { exact: false })).not.toBeInTheDocument();
  });

  it("usa la hora del override de hoy como hora efectiva, no la habitual (bug: Hoy no reflejaba la reprogramación)", () => {
    overridesByHabitId = { "1": "19:00" };
    renderBlock([habit({ id: "1", name: "Correr", scheduled_time: "07:00" })]);
    expect(screen.getByText("Correr — 19:00")).toBeInTheDocument();
    expect(screen.queryByText("Correr — 07:00")).not.toBeInTheDocument();
  });

  it("ordena por la hora efectiva: un override puede mover un hábito dentro del orden del bloque", () => {
    overridesByHabitId = { "3": "20:00" }; // "Mañana" reprogramado a la noche.
    renderBlock([
      habit({ id: "2", name: "Tarde", scheduled_time: "18:00" }),
      habit({ id: "3", name: "Mañana", scheduled_time: "07:00" }),
    ]);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Tarde — 18:00", "Mañana — 20:00"]);
  });

  // `completadas-oculta-tambien-los-habitos` (D-B, D-A, D-C): mismo control
  // que ya oculta las tareas completadas en el resto de Hoy.
  describe("el control de completadas también oculta los hábitos ya marcados", () => {
    it("con las completadas apagadas, un hábito ya marcado no se lista", () => {
      renderBlock(
        [
          habit({ id: "1", name: "Meditar", completed_today: true, scheduled_time: "07:00" }),
          habit({ id: "2", name: "Leer", completed_today: false, scheduled_time: "20:00" }),
        ],
        false,
      );
      expect(screen.queryByText("Meditar — 07:00")).not.toBeInTheDocument();
      expect(screen.getByText("Leer — 20:00")).toBeInTheDocument();
    });

    it("con las completadas apagadas, un hábito pendiente (o salteado — nunca marca `completed_today`) sigue en la lista", () => {
      renderBlock([habit({ id: "1", name: "Correr", completed_today: false, scheduled_time: "07:00" })], false);
      expect(screen.getByText("Correr — 07:00")).toBeInTheDocument();
    });

    it("con las completadas prendidas, un hábito ya marcado sigue en la lista", () => {
      renderBlock([habit({ id: "1", name: "Meditar", completed_today: true, scheduled_time: "07:00" })], true);
      expect(screen.getByText("Meditar — 07:00")).toBeInTheDocument();
    });

    it("el contador sigue contando todos los hábitos, incluidos los ocultos", () => {
      renderBlock(
        [
          habit({ id: "1", name: "Meditar", completed_today: true }),
          habit({ id: "2", name: "Leer", completed_today: false }),
        ],
        false,
      );
      expect(screen.getByText("Hábitos de hoy (1 de 2)")).toBeInTheDocument();
      // La lista quedó más corta (un solo `<li>`) aunque el contador diga 2.
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });
  });
});
