import { describe, expect, it } from "vitest";
import { dayBoundsUtc, isTaskCompletedToday, isTaskDueToday, isTaskOverdue, taskDueDay, todayInTimeZone } from "./today";

const BA = "America/Argentina/Buenos_Aires"; // UTC-3
const KIRITIMATI = "Pacific/Kiritimati"; // UTC+14 — la que más expone corrimientos de día (E13 del design)

describe("todayInTimeZone", () => {
  it("el mismo instante cae en días distintos según la zona (23:59 BA / 00:01 día siguiente en Kiritimati)", () => {
    // 2026-07-27T02:00:00Z es 2026-07-26 23:00 en Buenos Aires (UTC-3) y
    // 2026-07-27 16:00 en Kiritimati (UTC+14): mismo instante, dos días de
    // calendario distintos.
    const now = new Date("2026-07-27T02:00:00.000Z");
    expect(todayInTimeZone(now, BA)).toBe("2026-07-26");
    expect(todayInTimeZone(now, KIRITIMATI)).toBe("2026-07-27");
  });

  it("borde 23:59 en la zona del usuario: todavía es el día que termina", () => {
    // 23:59:30 en Buenos Aires del 26/07.
    const now = new Date("2026-07-27T02:59:30.000Z");
    expect(todayInTimeZone(now, BA)).toBe("2026-07-26");
  });

  it("borde 00:01 en la zona del usuario: ya es el día siguiente", () => {
    // 00:01:00 en Buenos Aires del 27/07.
    const now = new Date("2026-07-27T03:01:00.000Z");
    expect(todayInTimeZone(now, BA)).toBe("2026-07-27");
  });
});

describe("dayBoundsUtc", () => {
  it("los límites de hoy en BA, reproyectados a BA, dan 00:00:00.000 y 23:59:59.999", () => {
    // now = 2026-07-26 23:00 en BA, así que "hoy" en BA es el 26/07.
    const now = new Date("2026-07-27T02:00:00.000Z");
    const { startUtc, endUtc } = dayBoundsUtc(now, BA);
    expect(new Date(startUtc).toISOString()).toBe("2026-07-26T03:00:00.000Z");
    expect(new Date(endUtc).toISOString()).toBe("2026-07-27T02:59:59.999Z");
  });
});

describe("taskDueDay", () => {
  it("due_date (sin hora) se usa tal cual, sin conversión de zona", () => {
    expect(taskDueDay({ due_date: "2026-07-26", due_at: null }, KIRITIMATI)).toBe("2026-07-26");
  });

  it("una tarea con hora que en UTC cae otro día se atribuye al día de la zona del usuario, no al de la fecha UTC cruda", () => {
    // 2026-07-27T02:30:00Z: la porción de fecha del ISO es "2026-07-27",
    // pero en Buenos Aires (UTC-3) son las 23:30 del 26/07 — el bug clásico
    // de "se me movió un día" es devolver la fecha UTC cruda acá.
    const dueAt = "2026-07-27T02:30:00.000Z";
    expect(taskDueDay({ due_date: null, due_at: dueAt }, BA)).toBe("2026-07-26");
    // La misma tarea, para alguien en Kiritimati, sí vence el 27.
    expect(taskDueDay({ due_date: null, due_at: dueAt }, KIRITIMATI)).toBe("2026-07-27");
  });

  it("sin due_date ni due_at, no hay día de vencimiento", () => {
    expect(taskDueDay({ due_date: null, due_at: null }, BA)).toBeNull();
  });
});

describe("isTaskOverdue (E5: sin rollover)", () => {
  const now = new Date("2026-07-27T02:00:00.000Z"); // 26/07 23:00 en BA

  it("due_date de ayer, pendiente: atrasada", () => {
    expect(isTaskOverdue({ due_date: "2026-07-25", due_at: null, completed_at: null }, BA, now)).toBe(true);
  });

  it("due_date de hoy: no atrasada, aunque la hora ya haya pasado (sin rollover)", () => {
    expect(isTaskOverdue({ due_date: "2026-07-26", due_at: null, completed_at: null }, BA, now)).toBe(false);
  });

  it("un due_at de hoy más temprano no es atrasada: sigue siendo el día de hoy", () => {
    const dueAt = "2026-07-26T14:00:00.000Z"; // 11:00 BA, ya pasó respecto de las 23:00 de "now"
    expect(isTaskOverdue({ due_date: null, due_at: dueAt, completed_at: null }, BA, now)).toBe(false);
  });

  it("completada: nunca atrasada, sin importar la fecha", () => {
    expect(
      isTaskOverdue({ due_date: "2026-07-01", due_at: null, completed_at: "2026-07-20T00:00:00.000Z" }, BA, now),
    ).toBe(false);
  });

  it("sin fecha: no atrasada", () => {
    expect(isTaskOverdue({ due_date: null, due_at: null, completed_at: null }, BA, now)).toBe(false);
  });
});

describe("isTaskDueToday", () => {
  const now = new Date("2026-07-27T02:00:00.000Z"); // 26/07 23:00 en BA

  it("due_date de hoy: vence hoy", () => {
    expect(isTaskDueToday({ due_date: "2026-07-26", due_at: null }, BA, now)).toBe(true);
  });

  it("due_at de hoy más tarde (todavía no pasó): vence hoy igual", () => {
    const dueAt = "2026-07-27T01:30:00.000Z"; // 22:30 BA, dentro del 26/07
    expect(isTaskDueToday({ due_date: null, due_at: dueAt }, BA, now)).toBe(true);
  });

  it("due_date de mañana: no vence hoy", () => {
    expect(isTaskDueToday({ due_date: "2026-07-27", due_at: null }, BA, now)).toBe(false);
  });
});

describe("isTaskCompletedToday", () => {
  const now = new Date("2026-07-27T02:00:00.000Z"); // 26/07 23:00 en BA

  it("completada hoy en la zona del usuario, aunque el instante UTC ya sea del día siguiente", () => {
    const completedAt = "2026-07-27T01:45:00.000Z"; // 22:45 BA del 26/07
    expect(isTaskCompletedToday({ completed_at: completedAt }, BA, now)).toBe(true);
  });

  it("completada ayer: no cuenta como completada hoy", () => {
    expect(isTaskCompletedToday({ completed_at: "2026-07-25T12:00:00.000Z" }, BA, now)).toBe(false);
  });

  it("sin completar: no cuenta como completada hoy", () => {
    expect(isTaskCompletedToday({ completed_at: null }, BA, now)).toBe(false);
  });
});
