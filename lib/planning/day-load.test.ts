import { describe, expect, it } from "vitest";
import { computeDayLoad, formatDayLoad } from "./day-load";

describe("computeDayLoad", () => {
  it("lista vacía: todo en cero", () => {
    expect(computeDayLoad([])).toEqual({ totalMinutes: 0, withoutDuration: 0 });
  });

  it("todo con duración: suma directa", () => {
    expect(computeDayLoad([{ durationMinutes: 90 }, { durationMinutes: 30 }])).toEqual({
      totalMinutes: 120,
      withoutDuration: 0,
    });
  });

  it("todo sin duración: no suma nada, pero cuenta cada uno", () => {
    expect(computeDayLoad([{ durationMinutes: null }, { durationMinutes: null }])).toEqual({
      totalMinutes: 0,
      withoutDuration: 2,
    });
  });

  it("mezcla: suma lo que tiene duración, cuenta aparte lo que no", () => {
    expect(computeDayLoad([{ durationMinutes: 60 }, { durationMinutes: null }, { durationMinutes: 20 }])).toEqual({
      totalMinutes: 80,
      withoutDuration: 1,
    });
  });

  it("duración cero no es lo mismo que ausente: suma (nada), no cuenta como sin duración", () => {
    expect(computeDayLoad([{ durationMinutes: 0 }])).toEqual({ totalMinutes: 0, withoutDuration: 0 });
  });
});

describe("formatDayLoad", () => {
  it("nada que informar (día sin ningún elemento): null", () => {
    expect(formatDayLoad({ totalMinutes: 0, withoutDuration: 0 })).toBeNull();
  });

  it("horas exactas no muestran minutos", () => {
    expect(formatDayLoad({ totalMinutes: 120, withoutDuration: 0 })).toBe("2h planificadas");
  });

  it("menos de una hora muestra solo minutos", () => {
    expect(formatDayLoad({ totalMinutes: 45, withoutDuration: 0 })).toBe("45m planificadas");
  });

  it("horas y minutos combinados, con lo sin duración aparte", () => {
    expect(formatDayLoad({ totalMinutes: 320, withoutDuration: 4 })).toBe("5h 20m planificadas · 4 sin duración");
  });

  it("todo con duración: sin el aparte de 'sin duración'", () => {
    expect(formatDayLoad({ totalMinutes: 60, withoutDuration: 0 })).toBe("1h planificadas");
  });

  it("nada tiene duración: solo el conteo, nunca '0m planificadas'", () => {
    expect(formatDayLoad({ totalMinutes: 0, withoutDuration: 5 })).toBe("5 sin duración");
  });

  it("incluye atrasadas: lo dice", () => {
    expect(formatDayLoad({ totalMinutes: 120, withoutDuration: 0 }, true)).toBe("2h planificadas (incluye atrasadas)");
  });

  it("incluye atrasadas y sin duración a la vez", () => {
    expect(formatDayLoad({ totalMinutes: 90, withoutDuration: 2 }, true)).toBe(
      "1h 30m planificadas (incluye atrasadas) · 2 sin duración",
    );
  });
});
