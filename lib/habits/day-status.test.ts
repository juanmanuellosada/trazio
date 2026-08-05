import { describe, expect, it } from "vitest";
import { resolveHabitDayStatus } from "./day-status";

// Tarea 6.2 (calendario-legible-y-manipulable): "Son tres estados:
// pendiente, cumplido y salteado."
describe("resolveHabitDayStatus", () => {
  it("ninguna marca: pendiente", () => {
    expect(resolveHabitDayStatus(false, false)).toBe("pending");
  });

  it("completado: cumplido", () => {
    expect(resolveHabitDayStatus(true, false)).toBe("done");
  });

  it("salteado: salteado", () => {
    expect(resolveHabitDayStatus(false, true)).toBe("skipped");
  });

  it("completado y salteado a la vez (no debería pasar en el camino normal): cumplido gana", () => {
    expect(resolveHabitDayStatus(true, true)).toBe("done");
  });
});
