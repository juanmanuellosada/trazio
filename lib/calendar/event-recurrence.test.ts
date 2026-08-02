import { describe, expect, it } from "vitest";
import { eventRecurrenceEquals, fromGoogleRecurrenceLines, toGoogleRecurrenceLines } from "./event-recurrence";

describe("toGoogleRecurrenceLines", () => {
  it("sin repetición manda un array vacío, no `undefined` (Google borra la recurrencia solo con `[]` explícito)", () => {
    expect(toGoogleRecurrenceLines(null, false)).toEqual([]);
  });

  it("una regla sin fin viaja tal cual, con el prefijo RRULE:", () => {
    expect(toGoogleRecurrenceLines({ rule: "FREQ=WEEKLY;BYDAY=MO", endsAt: null, count: null }, false)).toEqual([
      "RRULE:FREQ=WEEKLY;BYDAY=MO",
    ]);
  });

  it("con `count` agrega COUNT a la misma línea", () => {
    expect(toGoogleRecurrenceLines({ rule: "FREQ=DAILY", endsAt: null, count: 5 }, false)).toEqual(["RRULE:FREQ=DAILY;COUNT=5"]);
  });

  it("con `endsAt` en un evento con hora agrega UNTIL en formato UTC completo", () => {
    expect(toGoogleRecurrenceLines({ rule: "FREQ=DAILY", endsAt: "2026-12-31", count: null }, false)).toEqual([
      "RRULE:FREQ=DAILY;UNTIL=20261231T235959Z",
    ]);
  });

  it("con `endsAt` en un evento de todo el día, UNTIL queda sin hora (mismo criterio que recurrence-scope.ts)", () => {
    expect(toGoogleRecurrenceLines({ rule: "FREQ=DAILY", endsAt: "2026-12-31", count: null }, true)).toEqual([
      "RRULE:FREQ=DAILY;UNTIL=20261231",
    ]);
  });
});

describe("fromGoogleRecurrenceLines", () => {
  it("sin líneas, o sin ninguna RRULE:, no hay repetición", () => {
    expect(fromGoogleRecurrenceLines(null)).toBeNull();
    expect(fromGoogleRecurrenceLines(undefined)).toBeNull();
    expect(fromGoogleRecurrenceLines(["EXDATE:20260101T000000Z"])).toBeNull();
  });

  it("separa la regla del COUNT", () => {
    expect(fromGoogleRecurrenceLines(["RRULE:FREQ=WEEKLY;COUNT=3"])).toEqual({
      rule: "FREQ=WEEKLY",
      endsAt: null,
      count: 3,
    });
  });

  it("separa la regla del UNTIL, quedándose con la fecha en yyyy-MM-dd", () => {
    expect(fromGoogleRecurrenceLines(["RRULE:FREQ=DAILY;UNTIL=20261231T235959Z"])).toEqual({
      rule: "FREQ=DAILY",
      endsAt: "2026-12-31",
      count: null,
    });
  });

  it("ignora líneas EXDATE, quedándose solo con la RRULE", () => {
    expect(fromGoogleRecurrenceLines(["EXDATE:20260101T000000Z", "RRULE:FREQ=WEEKLY;BYDAY=MO"])).toEqual({
      rule: "FREQ=WEEKLY;BYDAY=MO",
      endsAt: null,
      count: null,
    });
  });

  it("hace la vuelta completa: codificar y decodificar da el mismo valor", () => {
    const value = { rule: "FREQ=MONTHLY;BYMONTHDAY=15", endsAt: "2027-06-30", count: null };
    expect(fromGoogleRecurrenceLines(toGoogleRecurrenceLines(value, false))).toEqual(value);
  });
});

describe("eventRecurrenceEquals", () => {
  it("dos nulos son iguales", () => {
    expect(eventRecurrenceEquals(null, null)).toBe(true);
  });

  it("un nulo y un valor no son iguales", () => {
    expect(eventRecurrenceEquals(null, { rule: "FREQ=DAILY", endsAt: null, count: null })).toBe(false);
  });

  it("compara las tres partes", () => {
    const a = { rule: "FREQ=DAILY", endsAt: null, count: 3 };
    expect(eventRecurrenceEquals(a, { ...a })).toBe(true);
    expect(eventRecurrenceEquals(a, { ...a, count: 4 })).toBe(false);
  });
});
