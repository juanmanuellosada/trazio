import { describe, expect, it } from "vitest";
import { QUERY_FIELDS } from "./ast";
import { describeQueryFields, QUERY_FIELD_REFERENCE } from "./field-reference";
import { parseQuery } from "./parse";

/**
 * `filtros-alcanzables`, tarea 5.6: la referencia del lenguaje y el mensaje
 * de "campo desconocido" del parser tienen que derivar de una única fuente
 * (`QUERY_FIELDS`, D-E de design.md), no mantener su propia lista escrita a
 * mano. Estos tests prueban esa derivación, no una lista fija: si mañana se
 * suma un campo a `QUERY_FIELDS`, estos tests siguen pasando sin tocarlos,
 * y el campo nuevo aparece solo en la referencia y en el mensaje de error.
 */
describe("QUERY_FIELD_REFERENCE deriva de QUERY_FIELDS", () => {
  it("tiene exactamente un renglón por campo, en el mismo orden que QUERY_FIELDS", () => {
    expect(QUERY_FIELD_REFERENCE.map((entry) => entry.field)).toEqual(QUERY_FIELDS);
  });

  it("cada renglón trae un label, valores y un ejemplo no vacíos", () => {
    for (const entry of QUERY_FIELD_REFERENCE) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.values.length).toBeGreaterThan(0);
      expect(entry.example.length).toBeGreaterThan(0);
    }
  });

  it("cada ejemplo de la referencia es una consulta válida para su propio campo", () => {
    for (const entry of QUERY_FIELD_REFERENCE) {
      const result = parseQuery(entry.example);
      expect(result.ok, `"${entry.example}" (${entry.field}) tendría que parsear`).toBe(true);
    }
  });
});

describe("describeQueryFields", () => {
  it("lista los campos en el mismo orden que QUERY_FIELDS, con 'y' antes del último", () => {
    const names = QUERY_FIELDS as readonly string[];
    const expected = `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
    expect(describeQueryFields()).toBe(expected);
  });

  it("el mensaje de 'campo desconocido' del parser usa esta misma lista, no una escrita aparte", () => {
    const result = parseQuery("estado:abierto");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toBe(`Campo desconocido: "estado". Los campos disponibles son ${describeQueryFields()}.`);
  });
});
