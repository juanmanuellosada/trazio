import { describe, expect, it } from "vitest";
import { recurrenceEndsAtDay, recurrenceEndsAtOf } from "./ends-at";

describe("recurrenceEndsAtOf / recurrenceEndsAtDay", () => {
  it("ancla el fin de serie al final del día elegido en la zona del usuario, no en UTC", () => {
    // 23:59:59.999 del 15/8 en UTC-3 es 2026-08-16T02:59:59.999Z.
    expect(recurrenceEndsAtOf("2026-08-15", "America/Argentina/Buenos_Aires")).toBe("2026-08-16T02:59:59.999Z");
  });

  it("es el inverso de recurrenceEndsAtDay en la misma zona", () => {
    const instant = recurrenceEndsAtOf("2026-08-15", "America/Argentina/Buenos_Aires");
    expect(recurrenceEndsAtDay(instant, "America/Argentina/Buenos_Aires")).toBe("2026-08-15");
  });

  it("el mismo día elegido produce instantes UTC distintos según la zona", () => {
    const enBuenosAires = recurrenceEndsAtOf("2026-08-15", "America/Argentina/Buenos_Aires");
    const enUtc = recurrenceEndsAtOf("2026-08-15", "UTC");
    expect(enBuenosAires).not.toBe(enUtc);
    expect(enUtc).toBe("2026-08-15T23:59:59.999Z");
  });
});
