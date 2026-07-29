import { describe, expect, it } from "vitest";
import { parseTimeInput } from "./parse-time-input";

/**
 * Tests del parseo de hora escrita a mano (bloque 5.2/5.9): formato 24
 * horas, formato 12 horas con am/pm en sus variantes, hora sin minutos, de
 * corrido sin separador, y los casos inválidos que tienen que rechazarse.
 */

describe("parseTimeInput", () => {
  it("acepta HH:mm en 24 horas", () => {
    expect(parseTimeInput("13:47")).toEqual({ hour: 13, minute: 47 });
    expect(parseTimeInput("09:05")).toEqual({ hour: 9, minute: 5 });
  });

  it("acepta am/pm en sus variantes de escritura", () => {
    expect(parseTimeInput("1:47pm")).toEqual({ hour: 13, minute: 47 });
    expect(parseTimeInput("1:47 pm")).toEqual({ hour: 13, minute: 47 });
    expect(parseTimeInput("1:47 p. m.")).toEqual({ hour: 13, minute: 47 });
    expect(parseTimeInput("9am")).toEqual({ hour: 9, minute: 0 });
  });

  it("12am es medianoche y 12pm es mediodía", () => {
    expect(parseTimeInput("12am")).toEqual({ hour: 0, minute: 0 });
    expect(parseTimeInput("12pm")).toEqual({ hour: 12, minute: 0 });
  });

  it("acepta solo la hora, sin minutos", () => {
    expect(parseTimeInput("9")).toEqual({ hour: 9, minute: 0 });
    expect(parseTimeInput("21")).toEqual({ hour: 21, minute: 0 });
  });

  it("acepta la hora de corrido, sin separador", () => {
    expect(parseTimeInput("0930")).toEqual({ hour: 9, minute: 30 });
    expect(parseTimeInput("1347")).toEqual({ hour: 13, minute: 47 });
  });

  it("rechaza horas y minutos fuera de rango", () => {
    expect(parseTimeInput("25:00")).toBeNull();
    expect(parseTimeInput("13:70")).toBeNull();
    expect(parseTimeInput("13pm")).toBeNull(); // con am/pm el rango es 1-12
  });

  it("rechaza texto vacío o que no es una hora", () => {
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput("   ")).toBeNull();
    expect(parseTimeInput("mañana")).toBeNull();
  });
});
