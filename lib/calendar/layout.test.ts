import { describe, expect, it } from "vitest";
import type { CalendarBlock } from "./block";
import {
  allDaySpans,
  blocksForDay,
  continuousColumnIndex,
  continuousVisibleDays,
  CONTINUOUS_RANGE_DAYS,
  currentTimeMinutes,
  dateAtOffsetFromToday,
  dayCountForFormat,
  dayOffsetFromToday,
  layoutAllDayRow,
  layoutTimedBlocksForDay,
  packIntervals,
  segmentsForDay,
  TOTAL_CONTINUOUS_DAYS,
  visibleDaysForFormat,
} from "./layout";

// Zona sin horario de verano: simplifica la aritmética de los tests sin
// dejar de ejercitar la conversión de zona horaria (D8) — Buenos Aires es
// siempre UTC-3, así que un instante con offset "-03:00" y su día
// calendario correspondiente son fáciles de verificar a mano.
const TZ = "America/Argentina/Buenos_Aires";

let nextId = 0;
function makeBlock(overrides: Partial<CalendarBlock> & Pick<CalendarBlock, "start" | "end">): CalendarBlock {
  nextId += 1;
  return {
    id: `block-${nextId}`,
    type: "event",
    title: `Bloque ${nextId}`,
    color: "#283B56",
    allDay: false,
    ...overrides,
  };
}

describe("segmentsForDay", () => {
  it("recorta un bloque que cruza la medianoche en dos segmentos, uno por día", () => {
    const block = makeBlock({ start: "2026-08-01T23:00:00-03:00", end: "2026-08-02T02:00:00-03:00" });

    const day1 = segmentsForDay([block], "2026-08-01", TZ);
    expect(day1).toHaveLength(1);
    expect(day1[0]).toMatchObject({ startMinutes: 23 * 60, endMinutes: 24 * 60 });

    const day2 = segmentsForDay([block], "2026-08-02", TZ);
    expect(day2).toHaveLength(1);
    expect(day2[0]).toMatchObject({ startMinutes: 0, endMinutes: 2 * 60 });
  });

  it("un bloque que cruza la medianoche no aparece en un tercer día", () => {
    const block = makeBlock({ start: "2026-08-01T23:00:00-03:00", end: "2026-08-02T02:00:00-03:00" });
    expect(segmentsForDay([block], "2026-08-03", TZ)).toHaveLength(0);
    expect(segmentsForDay([block], "2026-07-31", TZ)).toHaveLength(0);
  });

  it("un bloque dentro de un solo día produce un único segmento con sus minutos exactos", () => {
    const block = makeBlock({ start: "2026-08-01T09:30:00-03:00", end: "2026-08-01T10:15:00-03:00" });
    const segments = segmentsForDay([block], "2026-08-01", TZ);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ startMinutes: 9 * 60 + 30, endMinutes: 10 * 60 + 15 });
  });

  it("ignora los bloques de todo el día: van por la fila separada, no por acá", () => {
    const block = makeBlock({ allDay: true, start: "2026-08-01", end: "2026-08-02" });
    expect(segmentsForDay([block], "2026-08-01", TZ)).toHaveLength(0);
  });
});

describe("packIntervals", () => {
  it("dos intervalos solapados se reparten en dos carriles distintos", () => {
    const items = [
      { start: 0, end: 60 },
      { start: 30, end: 90 },
    ];
    const packed = packIntervals(items, (i) => i.start, (i) => i.end);
    expect(packed.map((p) => p.lane).sort()).toEqual([0, 1]);
    expect(packed.every((p) => p.laneCount === 2)).toBe(true);
  });

  it("tres intervalos solapados a la vez ocupan tres carriles", () => {
    const items = [
      { start: 0, end: 60 },
      { start: 10, end: 50 },
      { start: 20, end: 40 },
    ];
    const packed = packIntervals(items, (i) => i.start, (i) => i.end);
    expect(new Set(packed.map((p) => p.lane)).size).toBe(3);
    expect(packed.every((p) => p.laneCount === 3)).toBe(true);
  });

  it("intervalos que no se solapan comparten el mismo carril", () => {
    const items = [
      { start: 0, end: 30 },
      { start: 30, end: 60 },
      { start: 60, end: 90 },
    ];
    const packed = packIntervals(items, (i) => i.start, (i) => i.end);
    expect(packed.every((p) => p.lane === 0 && p.laneCount === 1)).toBe(true);
  });

  it("un intervalo que empieza cuando otro todavía no terminó comparte carril distinto sin taparlo", () => {
    // A: 0-60, B: 30-90 (empieza antes de que A termine), C: 80-120 (empieza después de que A terminó y casi cuando B termina)
    const a = { id: "a", start: 0, end: 60 };
    const b = { id: "b", start: 30, end: 90 };
    const c = { id: "c", start: 80, end: 120 };
    const packed = packIntervals([a, b, c], (i) => i.start, (i) => i.end);

    const byId = Object.fromEntries(packed.map((p) => [p.item.id, p]));
    expect(byId.a!.lane).not.toBe(byId.b!.lane);
    expect(byId.b!.lane).not.toBe(byId.c!.lane);
    // A y C no se solapan entre sí, así que pueden compartir carril: el máximo de solapamiento simultáneo del cluster es 2.
    expect(byId.a!.laneCount).toBe(2);
    expect(byId.b!.laneCount).toBe(2);
    expect(byId.c!.laneCount).toBe(2);
  });
});

describe("layoutTimedBlocksForDay", () => {
  it("dos bloques a la misma hora se reparten el ancho: columnas distintas, mismo columnCount", () => {
    const a = makeBlock({ start: "2026-08-01T09:00:00-03:00", end: "2026-08-01T10:00:00-03:00" });
    const b = makeBlock({ start: "2026-08-01T09:30:00-03:00", end: "2026-08-01T10:30:00-03:00" });

    const positioned = layoutTimedBlocksForDay([a, b], "2026-08-01", TZ);
    expect(positioned).toHaveLength(2);
    expect(positioned[0]!.columnCount).toBe(2);
    expect(positioned[1]!.columnCount).toBe(2);
    expect(positioned[0]!.columnIndex).not.toBe(positioned[1]!.columnIndex);
  });

  it("bloques que no se solapan quedan cada uno con columnCount 1, sin repartir ancho de más", () => {
    const a = makeBlock({ start: "2026-08-01T08:00:00-03:00", end: "2026-08-01T09:00:00-03:00" });
    const b = makeBlock({ start: "2026-08-01T14:00:00-03:00", end: "2026-08-01T15:00:00-03:00" });

    const positioned = layoutTimedBlocksForDay([a, b], "2026-08-01", TZ);
    expect(positioned.every((p) => p.columnCount === 1 && p.columnIndex === 0)).toBe(true);
  });

  it("un evento que cruza la medianoche se ubica correctamente en cada uno de los dos días, cada uno con su propia disposición", () => {
    const overnight = makeBlock({ start: "2026-08-01T23:00:00-03:00", end: "2026-08-02T02:00:00-03:00" });
    const morningNextDay = makeBlock({ start: "2026-08-02T01:00:00-03:00", end: "2026-08-02T03:00:00-03:00" });

    const day1 = layoutTimedBlocksForDay([overnight], "2026-08-01", TZ);
    expect(day1).toHaveLength(1);
    expect(day1[0]).toMatchObject({ startMinutes: 23 * 60, endMinutes: 24 * 60, columnCount: 1 });

    // En el segundo día, el segmento de la madrugada del evento nocturno se solapa con `morningNextDay`.
    const day2 = layoutTimedBlocksForDay([overnight, morningNextDay], "2026-08-02", TZ);
    expect(day2).toHaveLength(2);
    expect(day2.every((p) => p.columnCount === 2)).toBe(true);
  });
});

describe("currentTimeMinutes", () => {
  it("devuelve los minutos desde medianoche cuando `now` cae en `dateKey`", () => {
    const now = new Date("2026-08-01T14:30:00-03:00");
    expect(currentTimeMinutes(now, "2026-08-01", TZ)).toBe(14 * 60 + 30);
  });

  it("devuelve null cuando `now` no cae ese día en la zona del usuario", () => {
    const now = new Date("2026-08-01T14:30:00-03:00");
    expect(currentTimeMinutes(now, "2026-08-02", TZ)).toBeNull();
  });

  it("resuelve en la zona del usuario, no en UTC: 23:30 en Buenos Aires ya es 02:30 UTC del día siguiente", () => {
    const now = new Date("2026-08-01T23:30:00-03:00"); // == 2026-08-02T02:30:00Z
    expect(currentTimeMinutes(now, "2026-08-01", TZ)).toBe(23 * 60 + 30);
    expect(currentTimeMinutes(now, "2026-08-02", TZ)).toBeNull();
  });
});

describe("allDaySpans", () => {
  const visibleDays = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"];

  it("un bloque de todo el día de una sola fecha ocupa un solo día (end exclusivo)", () => {
    const block = makeBlock({ allDay: true, start: "2026-08-04", end: "2026-08-05" });
    const spans = allDaySpans([block], visibleDays);
    expect(spans).toEqual([{ block, startIndex: 1, span: 1 }]);
  });

  it("un bloque de varios días se dibuja como un tramo continuo", () => {
    const block = makeBlock({ allDay: true, start: "2026-08-04", end: "2026-08-07" });
    const spans = allDaySpans([block], visibleDays);
    expect(spans).toEqual([{ block, startIndex: 1, span: 3 }]);
  });

  it("se recorta al rango visible: no aparece nada fuera de `visibleDays`", () => {
    const block = makeBlock({ allDay: true, start: "2026-08-01", end: "2026-08-10" });
    const spans = allDaySpans([block], visibleDays);
    expect(spans).toEqual([{ block, startIndex: 0, span: visibleDays.length }]);
  });

  it("un bloque totalmente fuera del rango visible no produce ningún tramo", () => {
    const block = makeBlock({ allDay: true, start: "2026-09-01", end: "2026-09-02" });
    expect(allDaySpans([block], visibleDays)).toHaveLength(0);
  });
});

describe("layoutAllDayRow", () => {
  it("dos bloques de todo el día que se solapan en días van en filas distintas", () => {
    const visibleDays = ["2026-08-03", "2026-08-04", "2026-08-05"];
    const a = makeBlock({ allDay: true, start: "2026-08-03", end: "2026-08-05" });
    const b = makeBlock({ allDay: true, start: "2026-08-04", end: "2026-08-06" });

    const positioned = layoutAllDayRow([a, b], visibleDays);
    const rows = new Set(positioned.map((p) => p.rowIndex));
    expect(rows.size).toBe(2);
    expect(positioned.every((p) => p.rowCount === 2)).toBe(true);
  });
});

describe("blocksForDay", () => {
  it("devuelve primero los de todo el día y después los que tienen hora, en orden de horario", () => {
    const allDay = makeBlock({ allDay: true, start: "2026-08-01", end: "2026-08-02" });
    const late = makeBlock({ start: "2026-08-01T18:00:00-03:00", end: "2026-08-01T19:00:00-03:00" });
    const early = makeBlock({ start: "2026-08-01T08:00:00-03:00", end: "2026-08-01T09:00:00-03:00" });

    expect(blocksForDay([late, allDay, early], "2026-08-01", TZ)).toEqual([allDay, early, late]);
  });
});

describe("dayCountForFormat", () => {
  it("mapea cada formato continuo a su cantidad de columnas", () => {
    expect(dayCountForFormat("dia")).toBe(1);
    expect(dayCountForFormat("cuatro-dias")).toBe(4);
    expect(dayCountForFormat("semana")).toBe(7);
  });
});

describe("continuousVisibleDays", () => {
  const today = "2026-08-05";

  it("devuelve `dayCount` días seguidos a partir de `startDate`, sin anclarse a ningún inicio de semana", () => {
    // 2026-08-05 es un miércoles: la tira arranca ahí igual, no se corre al lunes.
    expect(continuousVisibleDays("2026-08-05", 7, today)).toEqual([
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
    ]);
  });

  it("un solo día devuelve exactamente ese día", () => {
    expect(continuousVisibleDays("2026-08-05", 1, today)).toEqual(["2026-08-05"]);
  });

  it("recorta el inicio para no pasar de un año antes de hoy", () => {
    const days = continuousVisibleDays("2020-01-01", 7, today);
    expect(days[0]).toBe("2025-08-05"); // exactamente un año antes de `today`
  });

  it("recorta el inicio para que la tira entera no pase de un año después de hoy", () => {
    const days = continuousVisibleDays("2030-01-01", 7, today);
    expect(days[days.length - 1]).toBe("2027-08-05"); // exactamente un año después de `today`
  });
});

describe("dayOffsetFromToday / dateAtOffsetFromToday", () => {
  const today = "2026-08-05";

  it("hoy tiene offset 0", () => {
    expect(dayOffsetFromToday(today, today)).toBe(0);
  });

  it("un día futuro tiene offset positivo, uno pasado negativo", () => {
    expect(dayOffsetFromToday("2026-08-06", today)).toBe(1);
    expect(dayOffsetFromToday("2026-08-04", today)).toBe(-1);
  });

  it("son inversas", () => {
    expect(dateAtOffsetFromToday(dayOffsetFromToday("2026-09-01", today), today)).toBe("2026-09-01");
    expect(dateAtOffsetFromToday(-10, today)).toBe("2026-07-26");
  });
});

describe("continuousColumnIndex", () => {
  const today = "2026-08-05";

  it("hoy queda exactamente en el medio de la tira", () => {
    expect(continuousColumnIndex(today, today)).toBe(CONTINUOUS_RANGE_DAYS);
  });

  it("el total de columnas es un año antes y uno después de hoy, más hoy", () => {
    expect(TOTAL_CONTINUOUS_DAYS).toBe(CONTINUOUS_RANGE_DAYS * 2 + 1);
  });

  it("recorta a los bordes de la tira: no hay columna más allá de un año", () => {
    expect(continuousColumnIndex("1900-01-01", today)).toBe(0);
    expect(continuousColumnIndex("2100-01-01", today)).toBe(TOTAL_CONTINUOUS_DAYS - 1);
  });
});

describe("visibleDaysForFormat", () => {
  const today = "2026-08-05";

  it("día devuelve un único día", () => {
    expect(visibleDaysForFormat("dia", "2026-08-05", 1, today)).toEqual(["2026-08-05"]);
  });

  it("cuatro días devuelve el inicio y los tres siguientes", () => {
    expect(visibleDaysForFormat("cuatro-dias", "2026-08-05", 1, today)).toEqual(["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08"]);
  });

  it("semana ya no se ancla a `weekStartsOn`: trae 7 días seguidos desde donde empieza el tramo", () => {
    // 2026-08-05 es un miércoles: antes esto se corría al lunes (2026-08-03), ahora no.
    const days = visibleDaysForFormat("semana", "2026-08-05", 1, today);
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-08-05");
    expect(days[6]).toBe("2026-08-11");
  });

  it("mes trae semanas completas, incluidos días del mes anterior y siguiente, y sigue anclando a `weekStartsOn`", () => {
    // Agosto 2026 empieza un sábado: con semana desde el lunes, la grilla arranca antes del día 1.
    const days = visibleDaysForFormat("mes", "2026-08-15", 1, today);
    expect(days[0]).toBe("2026-07-27");
    expect(days.length % 7).toBe(0);
    expect(days).toContain("2026-08-31");
  });
});
