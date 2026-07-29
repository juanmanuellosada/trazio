import { describe, expect, it } from "vitest";
import { convertDurationDraft, deriveDurationDisplay, durationTextToMinutes } from "./duration-input";

/**
 * Tests de la conversión de duración (bloque 5.3/5.9): el modelo sigue
 * guardando siempre minutos (`duration_minutes`), la unidad es solo cómo
 * se escribe y se lee.
 */

describe("deriveDurationDisplay", () => {
  it("sin valor, arranca en minutos con el campo vacío", () => {
    expect(deriveDurationDisplay(null)).toEqual({ unit: "minutos", text: "" });
  });

  it("un valor que no es múltiplo de 60 se muestra en minutos", () => {
    expect(deriveDurationDisplay(45)).toEqual({ unit: "minutos", text: "45" });
    expect(deriveDurationDisplay(90)).toEqual({ unit: "minutos", text: "90" });
  });

  it("un múltiplo exacto de 60 se muestra en horas, la forma más legible", () => {
    expect(deriveDurationDisplay(60)).toEqual({ unit: "horas", text: "1" });
    expect(deriveDurationDisplay(120)).toEqual({ unit: "horas", text: "2" });
  });
});

describe("durationTextToMinutes", () => {
  it("en minutos, devuelve el número tal cual", () => {
    expect(durationTextToMinutes("45", "minutos")).toBe(45);
  });

  it("en horas, convierte a minutos y acepta valores fraccionarios", () => {
    expect(durationTextToMinutes("2", "horas")).toBe(120);
    expect(durationTextToMinutes("1.5", "horas")).toBe(90);
  });

  it("texto vacío o inválido no es una duración", () => {
    expect(durationTextToMinutes("", "minutos")).toBeNull();
    expect(durationTextToMinutes("abc", "minutos")).toBeNull();
    expect(durationTextToMinutes("-5", "minutos")).toBeNull();
    expect(durationTextToMinutes("0", "horas")).toBeNull();
  });
});

describe("convertDurationDraft", () => {
  it("convierte el texto tipeado a la nueva unidad sin cambiar la duración real", () => {
    expect(convertDurationDraft("120", "minutos", "horas")).toBe("2");
    expect(convertDurationDraft("2", "horas", "minutos")).toBe("120");
    expect(convertDurationDraft("90", "minutos", "horas")).toBe("1.5");
  });

  it("si el texto no es un número válido, lo deja como está", () => {
    expect(convertDurationDraft("", "minutos", "horas")).toBe("");
    expect(convertDurationDraft("abc", "minutos", "horas")).toBe("abc");
  });
});
