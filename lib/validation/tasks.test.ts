import { describe, expect, it } from "vitest";
import { DEFAULT_TASK_PRIORITY, resolveTaskPriorityColorHex } from "./tasks";

describe("resolveTaskPriorityColorHex", () => {
  it("resuelve cada prioridad a su hex, mismo valor que los tokens --priority-* de globals.css", () => {
    expect(resolveTaskPriorityColorHex(1)).toBe("#EC1E2A");
    expect(resolveTaskPriorityColorHex(2)).toBe("#F58220");
    expect(resolveTaskPriorityColorHex(3)).toBe("#3B6FF0");
    expect(resolveTaskPriorityColorHex(4)).toBe("#8A94A0");
  });

  it("una prioridad fuera de rango cae al color de la prioridad por defecto (Baja)", () => {
    expect(resolveTaskPriorityColorHex(99)).toBe(resolveTaskPriorityColorHex(DEFAULT_TASK_PRIORITY));
  });
});
