import { describe, expect, it } from "vitest";
import { findMenuTrigger } from "./menu-trigger";

describe("findMenuTrigger", () => {
  it("detecta el token de # apenas se escribe el símbolo", () => {
    expect(findMenuTrigger("#", 1)).toEqual({ symbol: "#", start: 0, query: "" });
  });

  it("detecta el token de @ y lo que se escribió después", () => {
    expect(findMenuTrigger("Comprar leche @trab", 20)).toEqual({ symbol: "@", start: 14, query: "trab" });
  });

  it("no hay token sin # ni @ antes del cursor", () => {
    expect(findMenuTrigger("Comprar leche", 8)).toBeNull();
  });

  it("un espacio corta el token: escribir después ya no abre el menú", () => {
    expect(findMenuTrigger("Terminar informe #Trabajo ", 27)).toBeNull();
  });

  it("un segundo símbolo corta el token anterior", () => {
    // "@urgente" arrancó un nuevo token; "compras" ya no es el que sigue abierto.
    expect(findMenuTrigger("Comprar regalo @compras @urgente", 33)).toEqual({
      symbol: "@",
      start: 24,
      query: "urgente",
    });
  });

  it("usa la posición del cursor, no el final del texto, cuando el cursor está en medio del token", () => {
    // "#Trab|ajo": el cursor está apenas después de "Trab", el resto del token todavía no cuenta.
    expect(findMenuTrigger("#Trabajo", 5)).toEqual({ symbol: "#", start: 0, query: "Trab" });
  });
});
