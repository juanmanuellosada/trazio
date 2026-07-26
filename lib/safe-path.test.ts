import { describe, expect, it } from "vitest";
import { appendNext, safeNextPath } from "./safe-path";

describe("safeNextPath", () => {
  it("acepta una ruta interna", () => {
    expect(safeNextPath("/proyecto/123")).toBe("/proyecto/123");
  });

  it("rechaza una URL absoluta, para evitar el open redirect", () => {
    expect(safeNextPath("https://evil.com")).toBe("/bandeja");
  });

  it("rechaza un protocolo relativo `//`", () => {
    expect(safeNextPath("//evil.com")).toBe("/bandeja");
  });

  it("usa el fallback indicado cuando no hay valor", () => {
    expect(safeNextPath(null, "/login")).toBe("/login");
    expect(safeNextPath(undefined, "/login")).toBe("/login");
  });
});

describe("appendNext", () => {
  it("no agrega el query string cuando next es el default", () => {
    expect(appendNext("/login", "/bandeja")).toBe("/login");
  });

  it("agrega next codificado cuando no es el default", () => {
    expect(appendNext("/login", "/proyecto/123")).toBe("/login?next=%2Fproyecto%2F123");
  });
});
