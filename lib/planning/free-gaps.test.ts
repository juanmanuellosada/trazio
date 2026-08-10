import { describe, expect, it } from "vitest";
import { computeFreeGaps, isDayEnded, sumGapMinutes, type Interval } from "./free-gaps";

const D = (hhmm: string) => new Date(`2026-08-09T${hhmm}:00.000Z`);

describe("isDayEnded", () => {
  it("antes de la hora de fin: no terminó", () => {
    expect(isDayEnded(D("13:00"), D("22:00"))).toBe(false);
  });

  it("justo en la hora de fin: terminó", () => {
    expect(isDayEnded(D("22:00"), D("22:00"))).toBe(true);
  });

  it("después de la hora de fin: terminó", () => {
    expect(isDayEnded(D("23:00"), D("22:00"))).toBe(true);
  });
});

describe("computeFreeGaps", () => {
  it("sin bloques ocupados: un único hueco desde ahora hasta el fin del día", () => {
    expect(computeFreeGaps({ now: D("18:00"), dayEnd: D("22:00"), busyBlocks: [] })).toEqual([
      { start: D("18:00"), end: D("22:00") },
    ]);
  });

  it("el día ya terminó: sin huecos, sin mirar busyBlocks", () => {
    expect(computeFreeGaps({ now: D("23:00"), dayEnd: D("22:00"), busyBlocks: [{ start: D("10:00"), end: D("11:00") }] })).toEqual(
      [],
    );
  });

  it("un bloque que ya pasó no descuenta tiempo libre", () => {
    const gaps = computeFreeGaps({ now: D("16:00"), dayEnd: D("22:00"), busyBlocks: [{ start: D("12:15"), end: D("13:00") }] });
    expect(gaps).toEqual([{ start: D("16:00"), end: D("22:00") }]);
  });

  it("un bloque en curso descuenta solo lo que falta", () => {
    const gaps = computeFreeGaps({ now: D("14:15"), dayEnd: D("22:00"), busyBlocks: [{ start: D("14:00"), end: D("15:00") }] });
    expect(gaps).toEqual([{ start: D("15:00"), end: D("22:00") }]);
  });

  it("el hueco termina en el próximo bloque agendado", () => {
    const gaps = computeFreeGaps({ now: D("13:00"), dayEnd: D("22:00"), busyBlocks: [{ start: D("15:00"), end: D("16:00") }] });
    expect(gaps[0]).toEqual({ start: D("13:00"), end: D("15:00") });
  });

  it("varios bloques: huecos entre ellos, ordenados de más próximo a más lejano", () => {
    const busyBlocks: Interval[] = [
      { start: D("15:00"), end: D("16:00") },
      { start: D("10:00"), end: D("11:00") },
      { start: D("18:00"), end: D("19:00") },
    ];
    expect(computeFreeGaps({ now: D("09:00"), dayEnd: D("22:00"), busyBlocks })).toEqual([
      { start: D("09:00"), end: D("10:00") },
      { start: D("11:00"), end: D("15:00") },
      { start: D("16:00"), end: D("18:00") },
      { start: D("19:00"), end: D("22:00") },
    ]);
  });

  it("bloques superpuestos se fusionan en uno solo", () => {
    const busyBlocks: Interval[] = [
      { start: D("14:00"), end: D("16:00") },
      { start: D("15:00"), end: D("17:00") },
    ];
    expect(computeFreeGaps({ now: D("13:00"), dayEnd: D("22:00"), busyBlocks })).toEqual([
      { start: D("13:00"), end: D("14:00") },
      { start: D("17:00"), end: D("22:00") },
    ]);
  });

  it("un bloque que cubre todo el resto del día: sin huecos", () => {
    const gaps = computeFreeGaps({ now: D("13:00"), dayEnd: D("22:00"), busyBlocks: [{ start: D("10:00"), end: D("23:00") }] });
    expect(gaps).toEqual([]);
  });
});

describe("sumGapMinutes", () => {
  it("suma la duración de todos los huecos", () => {
    const gaps: Interval[] = [
      { start: D("09:00"), end: D("10:00") },
      { start: D("11:00"), end: D("15:00") },
    ];
    expect(sumGapMinutes(gaps)).toBe(60 + 240);
  });

  it("sin huecos: cero", () => {
    expect(sumGapMinutes([])).toBe(0);
  });
});
