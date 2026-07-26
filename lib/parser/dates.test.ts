import { describe, expect, it } from "vitest";
import { formatDate, nextWeekStart, startOfWeek, today } from "./dates";
import { parse } from "./parse";
import type { ParserContext } from "./types";

/**
 * Cobertura dedicada de D15/R9 (bloque 11.7 de la configuración): en
 * `casos.ts` el contrato del parser siempre corre con `semanaEmpiezaEn: 1`
 * (lunes), así que por sí solo no prueba que cambiar
 * `user_preferences.week_starts_on` cambie algo de verdad. Acá se congela
 * el mismo "hoy" (un miércoles) y se varía únicamente `weekStartsOn`, para
 * que la diferencia en el resultado sea atribuible solo a esa preferencia.
 */

// 2026-07-29 es miércoles.
const HOY = { y: 2026, m: 7, d: 29 };

describe("startOfWeek / nextWeekStart — mismo día, weekStartsOn distinto", () => {
  it("lunes (1): la semana empezó el 27/07, la próxima empieza el 03/08", () => {
    expect(formatDate(startOfWeek(HOY, 1))).toBe("2026-07-27");
    expect(formatDate(nextWeekStart(HOY, 1))).toBe("2026-08-03");
  });

  it("domingo (0): la semana empezó el 26/07, la próxima empieza el 02/08", () => {
    expect(formatDate(startOfWeek(HOY, 0))).toBe("2026-07-26");
    expect(formatDate(nextWeekStart(HOY, 0))).toBe("2026-08-02");
  });

  it("sábado (6): la semana empezó el 25/07, la próxima empieza el 01/08", () => {
    expect(formatDate(startOfWeek(HOY, 6))).toBe("2026-07-25");
    expect(formatDate(nextWeekStart(HOY, 6))).toBe("2026-08-01");
  });
});

describe("parse() — «próxima semana» en el alta rápida, según week_starts_on (D15)", () => {
  const AHORA = new Date("2026-07-29T15:00:00Z"); // miércoles, mismo "hoy" que arriba en BA

  function contexto(semanaEmpiezaEn: 0 | 1 | 6): ParserContext {
    return {
      ahora: AHORA,
      zonaHoraria: "America/Argentina/Buenos_Aires",
      semanaEmpiezaEn,
      proyectos: [],
      etiquetas: [],
    };
  }

  it("la misma frase resuelve a una fecha distinta según el día de inicio de semana configurado", () => {
    const conLunes = parse("Enviar informe próxima semana", contexto(1));
    const conDomingo = parse("Enviar informe próxima semana", contexto(0));
    const conSabado = parse("Enviar informe próxima semana", contexto(6));

    expect(conLunes.dueDate).toBe("2026-08-03");
    expect(conDomingo.dueDate).toBe("2026-08-02");
    expect(conSabado.dueDate).toBe("2026-08-01");

    // Las tres son distintas entre sí: no es casualidad, es la preferencia.
    const valores = new Set([conLunes.dueDate, conDomingo.dueDate, conSabado.dueDate]);
    expect(valores.size).toBe(3);
  });

  it("confirma además que hoy() coincide con el miércoles asumido arriba", () => {
    expect(formatDate(today(AHORA, "America/Argentina/Buenos_Aires"))).toBe("2026-07-29");
  });
});
