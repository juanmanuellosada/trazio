import { describe, expect, it } from "vitest";
import { computeRemindAt } from "./mutations";

const REFERENCE = { referenceTime: "09:00:00", timezone: "America/Argentina/Buenos_Aires" };

describe("computeRemindAt (bloque 4.11, spec recordatorios-push, ampliado por recordatorios-con-hora-de-referencia)", () => {
  it("un recordatorio puntual guarda remind_at tal cual y offset_minutes null", () => {
    const result = computeRemindAt({ kind: "puntual", remindAt: "2026-08-01T10:00:00.000Z" }, REFERENCE);
    expect(result).toEqual({ remind_at: "2026-08-01T10:00:00.000Z", offset_minutes: null });
  });

  it("un recordatorio relativo calcula remind_at desde due_at más el offset (negativo = antes)", () => {
    const result = computeRemindAt(
      { kind: "relativo", offsetMinutes: -60, dueAt: "2026-08-01T10:00:00.000Z" },
      REFERENCE,
    );
    expect(result.offset_minutes).toBe(-60);
    expect(result.remind_at).toBe("2026-08-01T09:00:00.000Z");
  });

  it('"a la hora de la tarea" (offset 0) coincide exactamente con due_at', () => {
    const result = computeRemindAt(
      { kind: "relativo", offsetMinutes: 0, dueAt: "2026-08-01T10:00:00.000Z" },
      REFERENCE,
    );
    expect(result.remind_at).toBe("2026-08-01T10:00:00.000Z");
  });

  it("un relativo sobre una tarea con solo fecha usa la hora de referencia y la zona del usuario (D-B)", () => {
    const result = computeRemindAt(
      { kind: "relativo", offsetMinutes: -1440, dueAt: null, dueDate: "2026-08-05" },
      REFERENCE,
    );
    expect(result.offset_minutes).toBe(-1440);
    // 09:00 ART del 4 de agosto (un día antes del 5) = 12:00 UTC.
    expect(result.remind_at).toBe("2026-08-04T12:00:00.000Z");
  });

  it("el mismo cálculo respeta una zona horaria distinta de la del entorno", () => {
    const result = computeRemindAt(
      { kind: "relativo", offsetMinutes: -60, dueAt: null, dueDate: "2026-08-05" },
      { referenceTime: "09:00:00", timezone: "Asia/Tokyo" },
    );
    // 09:00 JST del 5 de agosto - 60min = 08:00 JST = 2026-08-04T23:00:00Z (JST = UTC+9).
    expect(result.remind_at).toBe("2026-08-04T23:00:00.000Z");
  });

  it("un recordatorio relativo sin due_at ni due_date se rechaza: nunca se crea uno sobre una tarea sin fecha", () => {
    expect(() =>
      computeRemindAt({ kind: "relativo", offsetMinutes: -30, dueAt: null }, REFERENCE),
    ).toThrow("recordatorio-relativo-sin-fecha");
  });
});
