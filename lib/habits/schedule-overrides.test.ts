import { describe, expect, it } from "vitest";
import { assertAppliesOnDate } from "./schedule-overrides";

// Tarea 6.5, D-H: `assertAppliesOnDate` pasa de aceptar solo "hoy" a
// aceptar cualquier día que le toque al hábito, pero sigue rechazando lo
// que no corresponde — un día anterior a su creación, un día que su
// frecuencia no cubre, y un hábito archivado. Aflojar de más es peor que
// no tocarla (principio del parser, D21, aplicado acá también).

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3, sin horario de verano.

function habit(overrides: Partial<Parameters<typeof assertAppliesOnDate>[0]> = {}) {
  return {
    frequency_type: "daily" as const,
    days_of_week: null,
    created_at: "2026-07-01T00:00:00.000Z",
    is_archived: false,
    ...overrides,
  };
}

describe("assertAppliesOnDate", () => {
  it("acepta hoy, como antes de ampliarla", () => {
    expect(() => assertAppliesOnDate(habit(), "2026-08-05", TZ)).not.toThrow();
  });

  it("acepta un día futuro que le toca (el calendario puede programar cualquier día visible, no solo hoy)", () => {
    expect(() => assertAppliesOnDate(habit(), "2026-09-15", TZ)).not.toThrow();
  });

  it("rechaza un día anterior a la creación del hábito", () => {
    expect(() => assertAppliesOnDate(habit({ created_at: "2026-08-01T12:00:00.000Z" }), "2026-07-31", TZ)).toThrow(
      /anterior a la creación/,
    );
  });

  it("acepta el mismo día de la creación", () => {
    expect(() => assertAppliesOnDate(habit({ created_at: "2026-08-01T12:00:00.000Z" }), "2026-08-01", TZ)).not.toThrow();
  });

  it("usa la fecha de creación en la zona horaria del usuario, no UTC", () => {
    // 2026-08-01T02:00:00Z es 2026-07-31 a las 23:00 en Buenos Aires (UTC-3):
    // el hábito "nació" el 31 de julio para este usuario, no el 1 de agosto.
    const created = habit({ created_at: "2026-08-01T02:00:00.000Z" });
    expect(() => assertAppliesOnDate(created, "2026-07-31", TZ)).not.toThrow();
  });

  it("rechaza un hábito archivado", () => {
    expect(() => assertAppliesOnDate(habit({ is_archived: true }), "2026-08-05", TZ)).toThrow(/archivado/);
  });

  it("rechaza un día que no corresponde a la frecuencia de días específicos", () => {
    const habitoLunes = habit({ frequency_type: "specific_days", days_of_week: [1] });
    // 2026-08-05 es un miércoles.
    expect(() => assertAppliesOnDate(habitoLunes, "2026-08-05", TZ)).toThrow(/según su frecuencia/);
  });

  it("acepta el día que sí corresponde a días específicos", () => {
    const habitoMiercoles = habit({ frequency_type: "specific_days", days_of_week: [3] });
    expect(() => assertAppliesOnDate(habitoMiercoles, "2026-08-05", TZ)).not.toThrow();
  });
});
