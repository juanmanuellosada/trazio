import { describe, expect, it } from "vitest";
import { applyPendingCountToTitle } from "./pending-today-title";

/** Tarea 2.3: formato del título con pendientes, sin pendientes, y al reaplicarse. */
describe("applyPendingCountToTitle", () => {
  it("antepone (N) cuando hay pendientes", () => {
    expect(applyPendingCountToTitle("Trazio", 8)).toBe("(8) Trazio");
  });

  it("no antepone nada con cero pendientes", () => {
    expect(applyPendingCountToTitle("Trazio", 0)).toBe("Trazio");
  });

  it("preserva el resto del título de la ruta actual, no un 'Trazio' fijo", () => {
    expect(applyPendingCountToTitle("Tarea suelta — Trazio", 5)).toBe("(5) Tarea suelta — Trazio");
  });

  it("reemplaza un prefijo previo en vez de acumularlo al reaplicarse", () => {
    expect(applyPendingCountToTitle("(3) Trazio", 5)).toBe("(5) Trazio");
  });

  it("quita un prefijo previo si el conteo baja a cero", () => {
    expect(applyPendingCountToTitle("(3) Trazio", 0)).toBe("Trazio");
  });
});
