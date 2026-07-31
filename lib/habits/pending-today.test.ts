import { describe, expect, it } from "vitest";
import { countHabitsPendingToday, isHabitPendingToday, type PendingTodayHabit } from "./pending-today";

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3, sin horario de verano.
const NOW = new Date("2026-07-31T15:00:00.000Z"); // 2026-07-31 en BA.

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

describe("isHabitPendingToday — única definición de 'pendiente de hoy' (tarea 5.1, D-H)", () => {
  it("un hábito que toca hoy y no se marcó está pendiente", () => {
    expect(isHabitPendingToday(habit(), TZ, NOW)).toBe(true);
  });

  it("un hábito que toca hoy pero ya se marcó no está pendiente", () => {
    expect(isHabitPendingToday(habit({ completed_today: true }), TZ, NOW)).toBe(false);
  });

  it("un hábito que no toca hoy no está pendiente, esté marcado o no", () => {
    const noTocaHoy = habit({ frequency_type: "specific_days", days_of_week: [1] }); // 2026-07-31 es viernes (isodow 5).
    expect(isHabitPendingToday(noTocaHoy, TZ, NOW)).toBe(false);
    expect(isHabitPendingToday({ ...noTocaHoy, completed_today: true }, TZ, NOW)).toBe(false);
  });

  it("un hábito archivado no está pendiente aunque su frecuencia lo haría tocar hoy y no esté marcado", () => {
    expect(isHabitPendingToday(habit({ is_archived: true }), TZ, NOW)).toBe(false);
  });

  it("un hábito creado después de hoy no está pendiente todavía", () => {
    expect(isHabitPendingToday(habit({ created_at: "2026-08-01T12:00:00.000Z" }), TZ, NOW)).toBe(false);
  });
});

describe("countHabitsPendingToday", () => {
  it("cuenta solo los que están pendientes de la lista", () => {
    const habits = [
      habit(), // pendiente
      habit({ completed_today: true }), // marcado, no cuenta
      habit({ is_archived: true }), // archivado, no cuenta
      habit({ frequency_type: "specific_days", days_of_week: [1] }), // no toca hoy, no cuenta
      habit(), // pendiente
    ];
    expect(countHabitsPendingToday(habits, TZ, NOW)).toBe(2);
  });

  it("una lista vacía cuenta cero", () => {
    expect(countHabitsPendingToday([], TZ, NOW)).toBe(0);
  });
});
