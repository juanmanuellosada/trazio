import { describe, expect, it } from "vitest";
import { defaultEventRange } from "./default-event-range";

describe("defaultEventRange (bloque 7.5/7.6)", () => {
  it("redondea hacia arriba a la próxima media hora, con una hora de duración", () => {
    const { start, end } = defaultEventRange(new Date("2026-08-05T10:10:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-05T10:30:00.000Z");
    expect(end.toISOString()).toBe("2026-08-05T11:30:00.000Z");
  });

  it("una hora ya en punto queda igual", () => {
    const { start } = defaultEventRange(new Date("2026-08-05T10:00:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-05T10:00:00.000Z");
  });

  it("redondear cerca de la hora siguiente cruza a la hora que sigue", () => {
    const { start, end } = defaultEventRange(new Date("2026-08-05T10:45:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-05T11:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });
});
