import { describe, expect, it } from "vitest";
import { continueRecurrenceFrom, countOccurrencesBefore, truncateRecurrenceBefore } from "./recurrence-scope";

// Tarea 3.9: las tres formas de tocar una serie recurrente empiezan acá,
// donde se puede probar sin red ni API simulada — es aritmética pura sobre
// RRULE. `lib/calendar/events.test.ts` cubre la orquestación completa
// (las llamadas a Google que arma cada `scope`).

const WEEKLY_TEN = ["RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=10"];
const WEEKLY_UNTIL = ["RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261201T000000Z"];
const WEEKLY_FOREVER = ["RRULE:FREQ=WEEKLY;BYDAY=MO"];

// Serie semanal los lunes, empezando el 2026-08-03 (un lunes).
const DTSTART = new Date("2026-08-03T10:00:00.000Z");

function mondayOffset(weeks: number): Date {
  return new Date(DTSTART.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
}

describe("countOccurrencesBefore", () => {
  it("cuenta cero ocurrencias antes de la primera", () => {
    expect(countOccurrencesBefore(WEEKLY_TEN, DTSTART, mondayOffset(0))).toBe(0);
  });

  it("cuenta las ocurrencias anteriores a la tercera (la escena del spec: primera y segunda quedan)", () => {
    expect(countOccurrencesBefore(WEEKLY_TEN, DTSTART, mondayOffset(2))).toBe(2);
  });

  it("no se cuelga con una regla sin fin: se detiene en la primera ocurrencia que ya no es anterior", () => {
    expect(countOccurrencesBefore(WEEKLY_FOREVER, DTSTART, mondayOffset(5))).toBe(5);
  });

  it("devuelve 0 si no hay línea RRULE", () => {
    expect(countOccurrencesBefore(["EXDATE:20260810T100000Z"], DTSTART, mondayOffset(2))).toBe(0);
  });
});

describe("truncateRecurrenceBefore — mitad pasada de 'esta y las siguientes'", () => {
  it("con COUNT, lo reemplaza por la cantidad exacta de ocurrencias previas", () => {
    const truncated = truncateRecurrenceBefore(WEEKLY_TEN, DTSTART, mondayOffset(2), false);
    expect(truncated).toEqual(["RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=2"]);
  });

  it("con UNTIL, lo reemplaza por un instante justo antes del corte", () => {
    const truncated = truncateRecurrenceBefore(WEEKLY_UNTIL, DTSTART, mondayOffset(2), false);
    const line = truncated[0];
    expect(line).toContain("UNTIL=");
    expect(line).not.toContain("20261201T000000Z");
    const untilValue = line.match(/UNTIL=(\d{8}T\d{6}Z)/)![1];
    expect(new Date(`${untilValue.slice(0, 4)}-${untilValue.slice(4, 6)}-${untilValue.slice(6, 8)}T${untilValue.slice(9, 11)}:${untilValue.slice(11, 13)}:${untilValue.slice(13, 15)}Z`).getTime()).toBeLessThan(
      mondayOffset(2).getTime(),
    );
  });

  it("sin límite previo, le agrega un UNTIL justo antes del corte", () => {
    const truncated = truncateRecurrenceBefore(WEEKLY_FOREVER, DTSTART, mondayOffset(3), false);
    expect(truncated[0]).toContain("UNTIL=");
  });

  it("un evento de todo el día recibe un UNTIL sin componente de hora (RFC 5545 exige que coincida con DTSTART)", () => {
    const truncated = truncateRecurrenceBefore(WEEKLY_FOREVER, DTSTART, mondayOffset(3), true);
    expect(truncated[0]).toMatch(/UNTIL=\d{8}$/);
    expect(truncated[0]).not.toMatch(/UNTIL=\d{8}T/);
  });

  it("conserva las líneas que no son RRULE (por ejemplo EXDATE de una ocurrencia ya borrada)", () => {
    const withExdate = [...WEEKLY_TEN, "EXDATE:20260810T100000Z"];
    const truncated = truncateRecurrenceBefore(withExdate, DTSTART, mondayOffset(2), false);
    expect(truncated).toContain("EXDATE:20260810T100000Z");
  });
});

describe("continueRecurrenceFrom — mitad futura de 'esta y las siguientes'", () => {
  it("con COUNT, resta las ocurrencias que ya pasaron: el total de la serie no cambia", () => {
    const continuing = continueRecurrenceFrom(WEEKLY_TEN, DTSTART, mondayOffset(2), false);
    expect(continuing).toEqual(["RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=8"]);
  });

  it("con UNTIL, lo conserva sin cambios: el tope de la serie sigue siendo el mismo", () => {
    const continuing = continueRecurrenceFrom(WEEKLY_UNTIL, DTSTART, mondayOffset(2), false);
    expect(continuing[0]).toContain("UNTIL=20261201T000000Z");
  });

  it("sin límite, sigue sin límite", () => {
    const continuing = continueRecurrenceFrom(WEEKLY_FOREVER, DTSTART, mondayOffset(2), false);
    expect(continuing).toEqual(WEEKLY_FOREVER);
  });
});
