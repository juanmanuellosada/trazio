import { describe, expect, it } from "vitest";
import { isProtectedPath } from "./proxy";

/**
 * Tests de `isProtectedPath` (bloque 8.6): confirma que la lista de rutas
 * protegidas sigue siendo correcta ahora que `/proximos`, `/filtros`,
 * `/etiquetas` y `/buscar` existen de verdad. `/buscar` faltaba en la lista
 * original pese a que la ruta ya está implementada.
 */
describe("isProtectedPath", () => {
  it("protege /buscar", () => {
    expect(isProtectedPath("/buscar")).toBe(true);
  });

  it("protege /proximos", () => {
    expect(isProtectedPath("/proximos")).toBe(true);
  });

  it("protege /filtros y sus páginas de resultado", () => {
    expect(isProtectedPath("/filtros")).toBe(true);
    expect(isProtectedPath("/filtros/123")).toBe(true);
  });

  it("protege /etiquetas y la página propia de una etiqueta", () => {
    expect(isProtectedPath("/etiquetas")).toBe(true);
    expect(isProtectedPath("/etiquetas/456")).toBe(true);
  });

  it("no protege rutas públicas", () => {
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/")).toBe(false);
  });
});
