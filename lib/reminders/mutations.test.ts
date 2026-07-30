import { describe, expect, it } from "vitest";
import { computeRemindAt } from "./mutations";

describe("computeRemindAt (bloque 4.11, spec recordatorios-push)", () => {
  it("un recordatorio puntual guarda remind_at tal cual y offset_minutes null", () => {
    const result = computeRemindAt({ kind: "puntual", remindAt: "2026-08-01T10:00:00.000Z" });
    expect(result).toEqual({ remind_at: "2026-08-01T10:00:00.000Z", offset_minutes: null });
  });

  it("un recordatorio relativo calcula remind_at desde due_at más el offset (negativo = antes)", () => {
    const result = computeRemindAt({ kind: "relativo", offsetMinutes: -60, dueAt: "2026-08-01T10:00:00.000Z" });
    expect(result.offset_minutes).toBe(-60);
    expect(result.remind_at).toBe("2026-08-01T09:00:00.000Z");
  });

  it('"a la hora de la tarea" (offset 0) coincide exactamente con due_at', () => {
    const result = computeRemindAt({ kind: "relativo", offsetMinutes: 0, dueAt: "2026-08-01T10:00:00.000Z" });
    expect(result.remind_at).toBe("2026-08-01T10:00:00.000Z");
  });

  it("un recordatorio relativo sin due_at se rechaza: nunca se crea uno sobre una tarea sin hora", () => {
    expect(() => computeRemindAt({ kind: "relativo", offsetMinutes: -30, dueAt: null })).toThrow(
      "recordatorio-relativo-sin-hora",
    );
  });
});
