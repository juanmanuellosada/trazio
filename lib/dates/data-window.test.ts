import { describe, expect, it } from "vitest";
import { dataWindowChunks, isoWeekChunksCovering, isoWeekEnd, isoWeekStart } from "./data-window";

describe("isoWeekStart", () => {
  it("devuelve el lunes de la semana ISO, sin importar `weekStartsOn` del usuario", () => {
    // 2026-08-05 es un miércoles.
    expect(isoWeekStart("2026-08-05")).toBe("2026-08-03");
  });

  it("un lunes es su propio inicio de semana", () => {
    expect(isoWeekStart("2026-08-03")).toBe("2026-08-03");
  });

  it("un domingo pertenece a la semana que empezó el lunes anterior", () => {
    expect(isoWeekStart("2026-08-09")).toBe("2026-08-03");
  });
});

describe("isoWeekEnd", () => {
  it("devuelve el domingo, seis días después del lunes", () => {
    expect(isoWeekEnd("2026-08-03")).toBe("2026-08-09");
  });
});

describe("isoWeekChunksCovering", () => {
  it("un rango dentro de una sola semana devuelve un único trozo", () => {
    expect(isoWeekChunksCovering("2026-08-04", "2026-08-06")).toEqual(["2026-08-03"]);
  });

  it("un rango que cruza dos semanas devuelve los dos lunes", () => {
    // 2026-08-08 (sábado) a 2026-08-11 (martes): cruza la semana que empieza el 2026-08-10.
    expect(isoWeekChunksCovering("2026-08-08", "2026-08-11")).toEqual(["2026-08-03", "2026-08-10"]);
  });

  it("un rango de varias semanas devuelve todos los lunes intermedios, sin huecos", () => {
    expect(isoWeekChunksCovering("2026-08-01", "2026-08-20")).toEqual(["2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17"]);
  });
});

describe("dataWindowChunks", () => {
  it("agrega dos semanas de margen a cada lado del rango visible (tarea 5.3)", () => {
    const visibleDays = ["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11"]; // semana del 3 al 9, empieza miércoles
    const chunks = dataWindowChunks(visibleDays);
    // Visible cae en semanas del 3 y del 10; con dos semanas de margen a cada lado: 20/7, 27/7, 3/8, 10/8, 17/8, 24/8.
    expect(chunks).toEqual(["2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24"]);
  });

  it("un rango vacío no pide ningún trozo", () => {
    expect(dataWindowChunks([])).toEqual([]);
  });

  it("correrse un solo día reutiliza casi todos los trozos ya pedidos", () => {
    const before = new Set(dataWindowChunks(["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11"]));
    const after = dataWindowChunks(["2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12"]);
    const reused = after.filter((chunk) => before.has(chunk));
    expect(reused.length).toBeGreaterThanOrEqual(after.length - 1);
  });
});
