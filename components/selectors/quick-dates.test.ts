import { describe, expect, it } from "vitest";
import { addDays, formatDate, nextWeekday, nextWeekStart, today } from "@/lib/parser/dates";
import type { ParserContext } from "@/lib/parser/types";
import { getQuickDateOptions } from "./quick-dates";

/**
 * Tests de los accesos rápidos del selector de fecha (bloque 4.3/4.9): cada
 * uno tiene que coincidir con una cuenta de calendario hecha de forma
 * independiente de `getQuickDateOptions` — así, si algún día dejara de
 * delegar en el parser y empezara a calcular la fecha por su cuenta, un
 * error de aritmética ahí lo detectaría este test, no solo una
 * inconsistencia consigo mismo.
 */

const AHORA = new Date("2026-07-26T18:00:00Z"); // domingo 26/07/2026 en America/Argentina/Buenos_Aires
const ZONA = "America/Argentina/Buenos_Aires";

function ctx(semanaEmpiezaEn: ParserContext["semanaEmpiezaEn"] = 1): Omit<ParserContext, "ahora"> {
  return { zonaHoraria: ZONA, semanaEmpiezaEn, proyectos: [], etiquetas: [] };
}

describe("getQuickDateOptions", () => {
  it("hoy y mañana son el día de hoy y el siguiente, en la zona horaria del usuario", () => {
    const hoy = today(AHORA, ZONA);
    const options = getQuickDateOptions(AHORA, ctx());

    expect(options.find((o) => o.key === "hoy")?.date).toBe(formatDate(hoy));
    expect(options.find((o) => o.key === "manana")?.date).toBe(formatDate(addDays(hoy, 1)));
  });

  it("este fin de semana es el próximo sábado (o hoy mismo, si hoy ya es sábado o domingo)", () => {
    const hoy = today(AHORA, ZONA);
    const dow = new Date(Date.UTC(hoy.y, hoy.m - 1, hoy.d)).getUTCDay();
    const esperado = dow === 0 || dow === 6 ? hoy : nextWeekday(hoy, 6, false);

    const finde = getQuickDateOptions(AHORA, ctx()).find((o) => o.key === "finde");
    expect(finde?.date).toBe(formatDate(esperado));
  });

  it("próxima semana respeta el día de inicio de semana de la cuenta, no un lunes fijo", () => {
    const hoy = today(AHORA, ZONA);

    const conLunes = getQuickDateOptions(AHORA, ctx(1)).find((o) => o.key === "proxima-semana");
    expect(conLunes?.date).toBe(formatDate(nextWeekStart(hoy, 1)));

    const conDomingo = getQuickDateOptions(AHORA, ctx(0)).find((o) => o.key === "proxima-semana");
    expect(conDomingo?.date).toBe(formatDate(nextWeekStart(hoy, 0)));
    expect(conDomingo?.date).not.toBe(conLunes?.date);
  });

  it("cada acceso rápido trae el día concreto al que corresponde, para mostrarlo junto al nombre", () => {
    for (const option of getQuickDateOptions(AHORA, ctx())) {
      expect(option.dayLabel.trim().length).toBeGreaterThan(0);
    }
  });
});
