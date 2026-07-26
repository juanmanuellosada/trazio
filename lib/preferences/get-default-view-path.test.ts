import { describe, expect, it } from "vitest";
import { pathForDefaultView } from "./get-default-view-path";

describe("pathForDefaultView (requirement «Pantalla por defecto al entrar», 11.5/11.7)", () => {
  it("'hoy' resuelve a /hoy", () => {
    expect(pathForDefaultView("hoy")).toBe("/hoy");
  });

  it("'bandeja' resuelve a /bandeja", () => {
    expect(pathForDefaultView("bandeja")).toBe("/bandeja");
  });

  it("sin valor (cuenta recién creada, antes del trigger) cae a /bandeja, el default de B4", () => {
    expect(pathForDefaultView(null)).toBe("/bandeja");
    expect(pathForDefaultView(undefined)).toBe("/bandeja");
  });

  it("un valor inesperado también cae a /bandeja, nunca revienta la redirección", () => {
    expect(pathForDefaultView("algo-que-no-existe")).toBe("/bandeja");
  });
});
