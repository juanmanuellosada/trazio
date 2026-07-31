import { describe, expect, it } from "vitest";
import { formatHabitDuration, formatHabitFrequency, formatHabitTime, formatStreak, pluralize } from "./format";

describe("formatHabitFrequency", () => {
  it("todos los días", () => {
    expect(formatHabitFrequency({ frequency_type: "daily", times_per_week: null, days_of_week: null })).toBe(
      "Todos los días",
    );
  });

  it("N veces por semana, con plural correcto", () => {
    expect(
      formatHabitFrequency({ frequency_type: "times_per_week", times_per_week: 3, days_of_week: null }),
    ).toBe("3 veces por semana");
    expect(
      formatHabitFrequency({ frequency_type: "times_per_week", times_per_week: 1, days_of_week: null }),
    ).toBe("1 vez por semana");
  });

  it("días específicos, en orden de semana y con 'y' antes del último", () => {
    expect(
      formatHabitFrequency({ frequency_type: "specific_days", times_per_week: null, days_of_week: [5, 1, 3] }),
    ).toBe("Lunes, miércoles y viernes");
  });
});

describe("formatHabitTime / formatHabitDuration", () => {
  it("sin hora programada muestra 'Todo el día'", () => {
    expect(formatHabitTime(null, 24)).toBe("Todo el día");
    expect(formatHabitTime(null, 12)).toBe("Todo el día");
  });

  it("en formato 24 horas, sin los segundos que trae `time` de Postgres", () => {
    expect(formatHabitTime("07:00", 24)).toBe("07:00");
    expect(formatHabitTime("07:00:00", 24)).toBe("07:00");
  });

  it("en formato 12 horas, con a.m. / p.m.", () => {
    expect(formatHabitTime("07:00:00", 12)).toBe("7:00 a.m.");
    expect(formatHabitTime("19:00:00", 12)).toBe("7:00 p.m.");
  });

  it("duración en minutos", () => {
    expect(formatHabitDuration(20)).toBe("20 min");
  });
});

describe("formatStreak (D-C: 'N veces por semana' se mide en semanas, el resto en días)", () => {
  it("hábito diario o de días específicos: unidad 'días'", () => {
    expect(formatStreak(1, "daily")).toBe("1 día");
    expect(formatStreak(3, "specific_days")).toBe("3 días");
  });

  it("hábito de N veces por semana: unidad 'semanas'", () => {
    expect(formatStreak(1, "times_per_week")).toBe("1 semana");
    expect(formatStreak(2, "times_per_week")).toBe("2 semanas");
  });
});

describe("pluralize", () => {
  it("singular solo para 1, plural para el resto", () => {
    expect(pluralize(1, "día", "días")).toBe("día");
    expect(pluralize(0, "día", "días")).toBe("días");
    expect(pluralize(2, "día", "días")).toBe("días");
  });
});
