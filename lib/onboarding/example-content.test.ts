import { describe, expect, it } from "vitest";
import { addDays, today, toDueAt } from "@/lib/parser/dates";
import { parse } from "@/lib/parser/parse";
import type { ParserContext } from "@/lib/parser/types";
import { parseQuery } from "@/lib/query-language/parse";
import { EXAMPLE_FILTER, EXAMPLE_TASK_WITH_PARSER_PHRASE } from "./example-content";

/**
 * Guarda que la frase de ejemplo (D-E, sembrada por `seed-example-content.ts`)
 * siga produciendo lo que promete: fecha, hora y prioridad ya aplicadas. Si el
 * parser cambia de forma que esta frase deje de reconocer alguno de los tres,
 * este test rompe antes de que una cuenta nueva reciba un ejemplo que miente
 * (riesgo "El texto de ejemplo envejece" del design).
 */
const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
const CONTEXTO: ParserContext = {
  ahora: new Date("2026-07-26T18:00:00Z"),
  zonaHoraria: ZONA_HORARIA,
  semanaEmpiezaEn: 1,
  proyectos: [],
  etiquetas: [],
};

describe(`EXAMPLE_TASK_WITH_PARSER_PHRASE ("${EXAMPLE_TASK_WITH_PARSER_PHRASE}") contra el parser real`, () => {
  it("produce fecha+hora (mañana a las 9) y prioridad urgente (p1)", () => {
    const resultado = parse(EXAMPLE_TASK_WITH_PARSER_PHRASE, CONTEXTO);
    const manana = addDays(today(CONTEXTO.ahora, ZONA_HORARIA), 1);

    expect(resultado.dueAt).toBe(toDueAt(manana, 9, 0, ZONA_HORARIA));
    expect(resultado.dueDate).toBeNull(); // fecha + hora combinan en dueAt, nunca en los dos a la vez
    expect(resultado.priority).toBe(1);
  });
});

describe(`EXAMPLE_FILTER.query ("${EXAMPLE_FILTER.query}") contra el lenguaje de consulta real`, () => {
  it("es una consulta válida del lenguaje de filtros", () => {
    const resultado = parseQuery(EXAMPLE_FILTER.query);
    expect(resultado.ok).toBe(true);
  });
});
