import { describe, expect, it } from "vitest";
import { formatTaskDueLabel } from "./format";

const BA = "America/Argentina/Buenos_Aires";
// "hoy" de referencia para todos los casos: domingo 2026-07-26 (currentDate de la sesión).
const now = new Date("2026-07-26T15:00:00.000Z"); // 12:00 en Buenos Aires

function prefs(overrides: Partial<Parameters<typeof formatTaskDueLabel>[1]> = {}) {
  return { now, timezone: BA, dateFormat: "dd-MM-yyyy" as const, timeFormat: 24 as const, ...overrides };
}

describe("formatTaskDueLabel — lenguaje natural a menos de 7 días (8.7)", () => {
  it("vence hoy: \"hoy\"", () => {
    expect(formatTaskDueLabel({ due_date: "2026-07-26", due_at: null }, prefs())).toBe("hoy");
  });

  it("vence mañana: \"mañana\"", () => {
    expect(formatTaskDueLabel({ due_date: "2026-07-27", due_at: null }, prefs())).toBe("mañana");
  });

  it("vence en 3 días (miércoles): \"el miércoles\"", () => {
    expect(formatTaskDueLabel({ due_date: "2026-07-29", due_at: null }, prefs())).toBe("el miércoles");
  });

  it("vence en 6 días (todavía dentro de la ventana): día de la semana", () => {
    expect(formatTaskDueLabel({ due_date: "2026-08-01", due_at: null }, prefs())).toBe("el sábado");
  });
});

describe("formatTaskDueLabel — lenguaje natural hacia atrás dentro de la ventana de 7 días", () => {
  it("venció ayer: \"ayer\"", () => {
    expect(formatTaskDueLabel({ due_date: "2026-07-25", due_at: null }, prefs())).toBe("ayer");
  });

  it("venció anteayer: \"anteayer\"", () => {
    expect(formatTaskDueLabel({ due_date: "2026-07-24", due_at: null }, prefs())).toBe("anteayer");
  });

  it("venció hace 3 días: \"hace 3 días\"", () => {
    expect(formatTaskDueLabel({ due_date: "2026-07-23", due_at: null }, prefs())).toBe("hace 3 días");
  });

  it("venció hace 6 días (todavía dentro de la ventana): \"hace 6 días\"", () => {
    expect(formatTaskDueLabel({ due_date: "2026-07-20", due_at: null }, prefs())).toBe("hace 6 días");
  });
});

describe("formatTaskDueLabel — formato numérico a partir de 7 días, en cualquiera de los dos sentidos", () => {
  it("vence en 7 días: fecha numérica, no día de la semana", () => {
    expect(formatTaskDueLabel({ due_date: "2026-08-02", due_at: null }, prefs())).toBe("02-08-2026");
  });

  it("respeta date_format = yyyy-MM-dd", () => {
    expect(
      formatTaskDueLabel({ due_date: "2026-08-02", due_at: null }, prefs({ dateFormat: "yyyy-MM-dd" })),
    ).toBe("2026-08-02");
  });

  it("venció hace 7 días: fecha numérica, no \"hace 7 días\"", () => {
    expect(formatTaskDueLabel({ due_date: "2026-07-19", due_at: null }, prefs())).toBe("19-07-2026");
  });

  it("venció hace 7 días respetando date_format = yyyy-MM-dd", () => {
    expect(
      formatTaskDueLabel({ due_date: "2026-07-19", due_at: null }, prefs({ dateFormat: "yyyy-MM-dd" })),
    ).toBe("2026-07-19");
  });
});

describe("formatTaskDueLabel — hora según time_format, en la zona del usuario", () => {
  it("agrega la hora en formato 24 horas cuando hay due_at", () => {
    const dueAt = "2026-07-26T22:30:00.000Z"; // 19:30 en Buenos Aires
    expect(formatTaskDueLabel({ due_date: null, due_at: dueAt }, prefs({ timeFormat: 24 }))).toBe("hoy · 19:30");
  });

  it("agrega la hora en formato 12 horas en español cuando hay due_at", () => {
    const dueAt = "2026-07-26T22:30:00.000Z"; // 19:30 en Buenos Aires
    expect(formatTaskDueLabel({ due_date: null, due_at: dueAt }, prefs({ timeFormat: 12 }))).toBe("hoy · 7:30 p.m.");
  });

  it("un due_at que en UTC cae al día siguiente se etiqueta con el día de la zona del usuario", () => {
    // 2026-07-27T02:15:00Z: fecha UTC 27/07, pero 26/07 23:15 en Buenos Aires.
    const dueAt = "2026-07-27T02:15:00.000Z";
    expect(formatTaskDueLabel({ due_date: null, due_at: dueAt }, prefs())).toBe("hoy · 23:15");
  });

  it("sin due_at no agrega hora, aunque haya due_date", () => {
    expect(formatTaskDueLabel({ due_date: "2026-07-27", due_at: null }, prefs())).toBe("mañana");
  });
});

describe("formatTaskDueLabel — sin fecha", () => {
  it("devuelve null cuando la tarea no tiene due_date ni due_at", () => {
    expect(formatTaskDueLabel({ due_date: null, due_at: null }, prefs())).toBeNull();
  });
});
