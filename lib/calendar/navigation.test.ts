import { describe, expect, it } from "vitest";
import { calendarRangeLabel, navigationStepLabel, shiftAnchorDate } from "./navigation";

describe("shiftAnchorDate", () => {
  it("día: avanza y retrocede un día", () => {
    expect(shiftAnchorDate("dia", "2026-08-05", 1)).toBe("2026-08-06");
    expect(shiftAnchorDate("dia", "2026-08-05", -1)).toBe("2026-08-04");
  });

  it("cuatro-dias: avanza y retrocede cuatro días", () => {
    expect(shiftAnchorDate("cuatro-dias", "2026-08-05", 1)).toBe("2026-08-09");
    expect(shiftAnchorDate("cuatro-dias", "2026-08-05", -1)).toBe("2026-08-01");
  });

  it("semana: avanza y retrocede siete días", () => {
    expect(shiftAnchorDate("semana", "2026-08-05", 1)).toBe("2026-08-12");
    expect(shiftAnchorDate("semana", "2026-08-05", -1)).toBe("2026-07-29");
  });

  it("mes: avanza y retrocede un mes, conservando el día", () => {
    expect(shiftAnchorDate("mes", "2026-08-05", 1)).toBe("2026-09-05");
    expect(shiftAnchorDate("mes", "2026-08-05", -1)).toBe("2026-07-05");
  });
});

describe("calendarRangeLabel", () => {
  it("día: día de la semana, número y mes", () => {
    expect(calendarRangeLabel("dia", "2026-08-05", ["2026-08-05"])).toBe("Miércoles 5 de agosto");
  });

  it("mes: nombre del mes y año", () => {
    expect(calendarRangeLabel("mes", "2026-08-05", [])).toBe("Agosto 2026");
  });

  it("semana dentro del mismo mes: solo el mes una vez", () => {
    const visibleDays = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"];
    expect(calendarRangeLabel("semana", "2026-08-05", visibleDays)).toBe("3 – 9 de agosto");
  });

  it("cuatro-dias que cruza de mes: los dos meses", () => {
    const visibleDays = ["2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02"];
    expect(calendarRangeLabel("cuatro-dias", "2026-07-30", visibleDays)).toBe("30 de julio – 2 de agosto");
  });

  // Tarea 6.5: el rótulo no asume un tramo alineado a un inicio de semana —
  // lee `visibleDays[0]`/`visibleDays[last]` tal cual, así que un tramo que
  // arranca un miércoles se rotula igual que cualquier otro.
  it("semana que no arranca un lunes (desplazamiento continuo, tarea 6.5): mismo rótulo genérico", () => {
    const visibleDays = ["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11"];
    expect(calendarRangeLabel("semana", "2026-08-05", visibleDays)).toBe("5 – 11 de agosto");
  });
});

describe("navigationStepLabel", () => {
  it("describe cuánto corren anterior/siguiente en cada formato (tarea 6.4)", () => {
    expect(navigationStepLabel("dia")).toBe("un día");
    expect(navigationStepLabel("cuatro-dias")).toBe("cuatro días");
    expect(navigationStepLabel("semana")).toBe("una semana");
    expect(navigationStepLabel("mes")).toBe("un mes");
  });
});
