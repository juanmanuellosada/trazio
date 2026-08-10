import { describe, expect, it } from "vitest";
import { buildPage, resolveOffset, resolvePageSize } from "./pagination";

describe("resolvePageSize", () => {
  it("usa el default sin límite pedido", () => {
    expect(resolvePageSize(undefined)).toBe(50);
  });

  it("respeta un límite dentro de rango", () => {
    expect(resolvePageSize(10)).toBe(10);
  });

  it("recorta al tope máximo", () => {
    expect(resolvePageSize(10_000)).toBe(200);
  });

  it("nunca da menos de 1, ni con 0 o negativos", () => {
    expect(resolvePageSize(0)).toBe(1);
    expect(resolvePageSize(-5)).toBe(1);
  });

  it("trunca un límite no entero", () => {
    expect(resolvePageSize(10.9)).toBe(10);
  });
});

describe("resolveOffset", () => {
  it("sin cursor arranca en 0", () => {
    expect(resolveOffset(undefined)).toBe(0);
  });

  it("lee el offset de un cursor válido", () => {
    expect(resolveOffset("50")).toBe(50);
  });

  it("un cursor inválido (no numérico, negativo) vuelve a 0 en vez de tirar", () => {
    expect(resolveOffset("no-es-un-numero")).toBe(0);
    expect(resolveOffset("-1")).toBe(0);
  });
});

describe("buildPage", () => {
  it("sin fila de más: no queda truncado, no hay cursor siguiente", () => {
    const page = buildPage([1, 2, 3], 0, 50);
    expect(page).toEqual({ items: [1, 2, 3], truncated: false, nextCursor: null });
  });

  it("con una fila de más: recorta al tamaño de página e informa el cursor siguiente", () => {
    const rows = Array.from({ length: 4 }, (_, i) => i);
    const page = buildPage(rows, 10, 3);
    expect(page.items).toEqual([0, 1, 2]);
    expect(page.truncated).toBe(true);
    expect(page.nextCursor).toBe("13");
  });
});
