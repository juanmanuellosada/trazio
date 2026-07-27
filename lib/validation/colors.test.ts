import { describe, expect, it } from "vitest";
import { PROJECT_COLOR_IDS, PROJECT_COLORS, resolveProjectColorHex } from "./colors";

describe("PROJECT_COLORS", () => {
  it("tiene los diez colores de la paleta fija", () => {
    expect(PROJECT_COLOR_IDS).toHaveLength(10);
    expect(Object.keys(PROJECT_COLORS)).toHaveLength(10);
  });
});

describe("resolveProjectColorHex", () => {
  it("resuelve un id de la paleta al hex del tema pedido", () => {
    expect(resolveProjectColorHex("verde", "light")).toBe(PROJECT_COLORS.verde.light);
    expect(resolveProjectColorHex("verde", "dark")).toBe(PROJECT_COLORS.verde.dark);
  });

  it("resuelve un color nulo (la Bandeja) al azul de marca según el tema", () => {
    expect(resolveProjectColorHex(null, "light")).toBe("#283B56");
    expect(resolveProjectColorHex(null, "dark")).toBe("#8CA3C9");
  });

  it("nunca tira: cualquier valor que no sea un id de la paleta ni nulo cae al gris neutro", () => {
    expect(() => resolveProjectColorHex("basura", "light")).not.toThrow();
    expect(() => resolveProjectColorHex("", "light")).not.toThrow();
    expect(() => resolveProjectColorHex(undefined as unknown as string, "light")).not.toThrow();

    expect(resolveProjectColorHex("basura", "light")).toBe("#5C6675");
    expect(resolveProjectColorHex("", "dark")).toBe("#94A3B8");
    expect(resolveProjectColorHex(undefined as unknown as string, "light")).toBe("#5C6675");
  });
});
