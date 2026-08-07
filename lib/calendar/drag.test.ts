import { describe, expect, it } from "vitest";
import {
  clampMinutes,
  instantFromDayMinutes,
  isSameRange,
  localMinutesOfDay,
  minutesToTimeString,
  moveBlockToPosition,
  pixelsToMinutes,
  resizeBlockToPosition,
  snapToQuarterHour,
} from "./drag";

// Requirements de `specs/manipulacion-temporal/spec.md`: el ajuste a 15
// minutos aplica igual a mover y a redimensionar (tarea 6.1/6.2), y es
// justo el borde —minuto 7 contra minuto 8, un bloque que quedaría con
// duración cero o negativa, el final del día— lo que rompe si algo está
// mal (nota inicial del grupo 6 en `tasks.md`).

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3, sin horario de verano.

describe("snapToQuarterHour", () => {
  it("redondea al múltiplo de 15 más cercano", () => {
    expect(snapToQuarterHour(0)).toBe(0);
    expect(snapToQuarterHour(14)).toBe(15);
    expect(snapToQuarterHour(15)).toBe(15);
    expect(snapToQuarterHour(22)).toBe(15);
    expect(snapToQuarterHour(23)).toBe(30);
  });

  it("el minuto 7 y el minuto 8 caen en múltiplos de 15 distintos (el borde que rompe)", () => {
    // 7/15 = 0.4667 -> redondea a 0 (el múltiplo anterior).
    expect(snapToQuarterHour(7)).toBe(0);
    // 8/15 = 0.5333 -> redondea a 1 (el múltiplo siguiente).
    expect(snapToQuarterHour(8)).toBe(15);
  });

  it("nunca devuelve algo que no sea múltiplo de 15", () => {
    for (let m = 0; m <= 120; m++) {
      expect(snapToQuarterHour(m) % 15).toBe(0);
    }
  });
});

describe("localMinutesOfDay / instantFromDayMinutes", () => {
  it("son inversas dentro del mismo día", () => {
    const instant = instantFromDayMinutes("2026-08-05", 14 * 60 + 30, TZ);
    expect(localMinutesOfDay(instant, TZ)).toBe(14 * 60 + 30);
  });

  it("1440 minutos (24:00) cae en la medianoche del día siguiente", () => {
    const instant = instantFromDayMinutes("2026-08-05", 24 * 60, TZ);
    expect(localMinutesOfDay(instant, TZ)).toBe(0);
    // Es el 6 de agosto a las 00:00 -03:00, no el 5.
    expect(instant.toISOString()).toBe(new Date("2026-08-06T00:00:00-03:00").toISOString());
  });
});

describe("moveBlockToPosition (tarea 6.1, mover conserva la duración)", () => {
  it("mueve una tarea de las 10:00 a las 14:00 (escenario del spec)", () => {
    const originalStart = instantFromDayMinutes("2026-08-05", 10 * 60, TZ);
    const durationMinutes = 60;
    const rawStartMinutes = localMinutesOfDay(originalStart, TZ) + 4 * 60; // arrastrado 4 horas más tarde
    const result = moveBlockToPosition(rawStartMinutes, durationMinutes, "2026-08-05", TZ);
    expect(localMinutesOfDay(result.start, TZ)).toBe(14 * 60);
    expect(localMinutesOfDay(result.end, TZ)).toBe(15 * 60);
  });

  it("soltar en una posición ~14:07 ajusta a las 14:00, nunca a un minuto suelto", () => {
    const result = moveBlockToPosition(14 * 60 + 7, 30, "2026-08-05", TZ);
    expect(localMinutesOfDay(result.start, TZ)).toBe(14 * 60);
  });

  it("soltar en una posición ~14:08 ajusta a las 14:15", () => {
    const result = moveBlockToPosition(14 * 60 + 8, 30, "2026-08-05", TZ);
    expect(localMinutesOfDay(result.start, TZ)).toBe(14 * 60 + 15);
  });

  it("no deja que el bloque se recorte por el final del día: el inicio se recorta para que la duración entera entre", () => {
    // Un bloque de 2 horas que se intenta soltar a las 23:30 no puede
    // empezar ahí (terminaría a la 1:30 del día siguiente): se recorta a
    // como mucho 22:00, para que las 24:00 sean el límite del fin, no del
    // inicio.
    const result = moveBlockToPosition(23 * 60 + 30, 120, "2026-08-05", TZ);
    expect(localMinutesOfDay(result.start, TZ)).toBe(22 * 60);
    expect(result.end.toISOString()).toBe(new Date("2026-08-06T00:00:00-03:00").toISOString());
  });

  it("no deja que el inicio sea negativo: se recorta a las 00:00", () => {
    const result = moveBlockToPosition(-45, 30, "2026-08-05", TZ);
    expect(localMinutesOfDay(result.start, TZ)).toBe(0);
  });

  it("mover también cambia de día cuando se suelta en la columna de otro día", () => {
    const result = moveBlockToPosition(9 * 60, 30, "2026-08-07", TZ);
    expect(new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(result.start)).toBe("2026-08-07");
  });
});

describe("resizeBlockToPosition (tarea 6.2, redimensionar cambia la duración)", () => {
  it("estira un evento de 30 minutos hasta cubrir una hora (escenario del spec)", () => {
    const originalStart = instantFromDayMinutes("2026-08-05", 9 * 60, TZ);
    const rawEndMinutes = 9 * 60 + 60; // arrastrado hasta la hora exacta
    const result = resizeBlockToPosition(originalStart, rawEndMinutes, TZ);
    expect(localMinutesOfDay(result.end, TZ)).toBe(10 * 60);
  });

  it("soltar en una posición que corresponde a 47 minutos de duración ajusta a 45", () => {
    const originalStart = instantFromDayMinutes("2026-08-05", 9 * 60, TZ);
    const result = resizeBlockToPosition(originalStart, 9 * 60 + 47, TZ);
    expect(localMinutesOfDay(result.end, TZ)).toBe(9 * 60 + 45);
  });

  it("nunca deja una duración cero o negativa: el mínimo es 15 minutos", () => {
    const originalStart = instantFromDayMinutes("2026-08-05", 9 * 60, TZ);
    // Arrastrado hacia arriba, por encima del propio inicio.
    const result = resizeBlockToPosition(originalStart, 8 * 60, TZ);
    expect(localMinutesOfDay(result.end, TZ)).toBe(9 * 60 + 15);
  });

  it("no cruza la medianoche: el máximo es el final del día de inicio", () => {
    const originalStart = instantFromDayMinutes("2026-08-05", 23 * 60, TZ);
    const result = resizeBlockToPosition(originalStart, 26 * 60, TZ);
    expect(result.end.toISOString()).toBe(new Date("2026-08-06T00:00:00-03:00").toISOString());
  });

  it("el inicio nunca cambia al redimensionar", () => {
    const originalStart = instantFromDayMinutes("2026-08-05", 9 * 60, TZ);
    const result = resizeBlockToPosition(originalStart, 200, TZ);
    expect(result.start).toBe(originalStart);
  });
});

describe("isSameRange (guard: soltar donde estaba no dispara mutación)", () => {
  it("es igual cuando el rango de destino coincide con el del bloque", () => {
    const start = instantFromDayMinutes("2026-08-05", 10 * 60, TZ);
    const end = instantFromDayMinutes("2026-08-05", 11 * 60, TZ);
    expect(isSameRange(start.toISOString(), end.toISOString(), { start, end })).toBe(true);
  });

  it("no es igual si el inicio cambió, aunque sea por 15 minutos", () => {
    const start = instantFromDayMinutes("2026-08-05", 10 * 60, TZ);
    const end = instantFromDayMinutes("2026-08-05", 11 * 60, TZ);
    const movedStart = instantFromDayMinutes("2026-08-05", 10 * 60 + 15, TZ);
    expect(isSameRange(start.toISOString(), end.toISOString(), { start: movedStart, end })).toBe(false);
  });

  it("no es igual si el fin cambió (redimensionado a la misma posición de siempre no cuenta como distinto, pero un cambio real sí)", () => {
    const start = instantFromDayMinutes("2026-08-05", 10 * 60, TZ);
    const end = instantFromDayMinutes("2026-08-05", 11 * 60, TZ);
    const movedEnd = instantFromDayMinutes("2026-08-05", 11 * 60 + 15, TZ);
    expect(isSameRange(start.toISOString(), end.toISOString(), { start, end: movedEnd })).toBe(false);
  });

  it("no es igual si cambió de día, incluso con la misma hora local", () => {
    const start = instantFromDayMinutes("2026-08-05", 10 * 60, TZ);
    const end = instantFromDayMinutes("2026-08-05", 11 * 60, TZ);
    const otherDayStart = instantFromDayMinutes("2026-08-06", 10 * 60, TZ);
    const otherDayEnd = instantFromDayMinutes("2026-08-06", 11 * 60, TZ);
    expect(isSameRange(start.toISOString(), end.toISOString(), { start: otherDayStart, end: otherDayEnd })).toBe(false);
  });

  it("compara por instante, no por representación del string: mismo instante con offset distinto sigue siendo igual", () => {
    expect(isSameRange("2026-08-05T13:00:00.000Z", "2026-08-05T14:00:00.000Z", {
      start: new Date("2026-08-05T10:00:00-03:00"),
      end: new Date("2026-08-05T11:00:00-03:00"),
    })).toBe(true);
  });
});

describe("pixelsToMinutes / minutesToTimeString / clampMinutes", () => {
  it("convierte píxeles a minutos según la altura de una hora", () => {
    expect(pixelsToMinutes(48, 48)).toBe(60);
    expect(pixelsToMinutes(24, 48)).toBe(30);
  });

  it("formatea minutos como HH:mm:ss para habit_schedule_overrides", () => {
    expect(minutesToTimeString(9 * 60)).toBe("09:00:00");
    expect(minutesToTimeString(0)).toBe("00:00:00");
  });

  it("clampMinutes no deja salir del rango", () => {
    expect(clampMinutes(-10, 0, 100)).toBe(0);
    expect(clampMinutes(200, 0, 100)).toBe(100);
    expect(clampMinutes(50, 0, 100)).toBe(50);
  });
});
