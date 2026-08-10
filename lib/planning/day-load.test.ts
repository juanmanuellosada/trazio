import { describe, expect, it } from "vitest";
import { computeDayLoad, formatCargaDelDia, formatDayLoad, type DayLoad } from "./day-load";

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

describe("formatDayLoad (Próximos, sin tocar por el-dia-que-entra)", () => {
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

const NOTHING_UNASSIGNED: DayLoad = { totalMinutes: 0, withoutDuration: 0 };

describe("formatCargaDelDia", () => {
  it("tiempo libre solo, sin nada pedido sin lugar", () => {
    expect(formatCargaDelDia({ freeMinutes: 220, dayEnded: false, unassigned: NOTHING_UNASSIGNED })).toBe(
      "Te quedan 3h 40m libres.",
    );
  });

  it("tiempo libre y pedido sin lugar, el ejemplo de la propuesta", () => {
    expect(
      formatCargaDelDia({ freeMinutes: 220, dayEnded: false, unassigned: { totalMinutes: 135, withoutDuration: 0 } }),
    ).toBe("Te quedan 3h 40m libres y 2h 15m de tareas sin agendar.");
  });

  it("avisa cuando lo pedido no entra en el tiempo libre que queda", () => {
    expect(
      formatCargaDelDia({ freeMinutes: 220, dayEnded: false, unassigned: { totalMinutes: 300, withoutDuration: 0 } }),
    ).toBe("Te quedan 3h 40m libres y 5h de tareas sin agendar. No te entra todo en lo que queda.");
  });

  it("no avisa cuando lo pedido entra justo", () => {
    expect(
      formatCargaDelDia({ freeMinutes: 220, dayEnded: false, unassigned: { totalMinutes: 220, withoutDuration: 0 } }),
    ).toBe("Te quedan 3h 40m libres y 3h 40m de tareas sin agendar.");
  });

  it("pedido sin lugar con algo sin duración aparte", () => {
    expect(
      formatCargaDelDia({ freeMinutes: 220, dayEnded: false, unassigned: { totalMinutes: 135, withoutDuration: 4 } }),
    ).toBe("Te quedan 3h 40m libres y 2h 15m de tareas sin agendar (y 4 sin duración).");
  });

  it("nada tiene duración: nunca '0m' de pedido sin lugar", () => {
    expect(
      formatCargaDelDia({ freeMinutes: 220, dayEnded: false, unassigned: { totalMinutes: 0, withoutDuration: 5 } }),
    ).toBe("Te quedan 3h 40m libres y 5 tareas sin duración estimada.");
  });

  it("día terminado, sin nada pedido sin lugar", () => {
    expect(formatCargaDelDia({ freeMinutes: 0, dayEnded: true, unassigned: NOTHING_UNASSIGNED })).toBe(
      "El día ya terminó.",
    );
  });

  it("día terminado, con pedido sin lugar", () => {
    expect(
      formatCargaDelDia({ freeMinutes: 0, dayEnded: true, unassigned: { totalMinutes: 135, withoutDuration: 0 } }),
    ).toBe("El día ya terminó, pero te quedan 2h 15m de tareas sin agendar.");
  });

  it("tiempo libre en cero sin que el día haya terminado: se muestra igual, sin negativos", () => {
    expect(formatCargaDelDia({ freeMinutes: 0, dayEnded: false, unassigned: NOTHING_UNASSIGNED })).toBe(
      "Te quedan 0m libres.",
    );
  });

  it("minutos fraccionarios (now trae segundos) se redondean al mostrar, nunca en crudo", () => {
    expect(formatCargaDelDia({ freeMinutes: 111.12438333333333, dayEnded: false, unassigned: NOTHING_UNASSIGNED })).toBe(
      "Te quedan 1h 51m libres.",
    );
  });
});
