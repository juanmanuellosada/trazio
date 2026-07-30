import { describe, expect, it } from "vitest";
import { parseQuery } from "./parse";

/**
 * Tests unitarios del parser (bloque 2.10): los diez campos, precedencia,
 * paréntesis, negación de grupo, comillas, y el caso de referencia del
 * roadmap. Cada test verifica la forma del AST, no el resultado de
 * evaluarlo — eso lo cubren los tests de `buscar_tareas` en
 * `supabase/tests/`.
 */

function ok(result: ReturnType<typeof parseQuery>) {
  if (!result.ok) throw new Error(`Se esperaba éxito, hubo error: ${result.error.message}`);
  return result.ast;
}

function fail(result: ReturnType<typeof parseQuery>) {
  if (result.ok) throw new Error("Se esperaba un error de sintaxis y el parser tuvo éxito.");
  return result.error;
}

describe("los diez campos", () => {
  it("priority: un solo valor", () => {
    expect(ok(parseQuery("priority:1"))).toEqual({ type: "field", field: "priority", values: [1] });
  });

  it("priority: varios valores por coma", () => {
    expect(ok(parseQuery("priority:1,2"))).toEqual({ type: "field", field: "priority", values: [1, 2] });
  });

  it("priority: fuera de rango produce error en la posición del valor", () => {
    const error = fail(parseQuery("priority:5"));
    expect(error.position).toBe("priority:".length);
    expect(error.message).toMatch(/1 y 4/);
  });

  it("due: palabra clave", () => {
    expect(ok(parseQuery("due:today"))).toEqual({
      type: "field",
      field: "due",
      condition: { kind: "today" },
    });
  });

  it("due: fecha exacta", () => {
    expect(ok(parseQuery("due:2026-08-10"))).toEqual({
      type: "field",
      field: "due",
      condition: { kind: "exact", date: "2026-08-10" },
    });
  });

  it("due: comparadores before y after", () => {
    expect(ok(parseQuery("due:before:2026-08-01"))).toEqual({
      type: "field",
      field: "due",
      condition: { kind: "before", date: "2026-08-01" },
    });
    expect(ok(parseQuery("due:after:2026-08-01"))).toEqual({
      type: "field",
      field: "due",
      condition: { kind: "after", date: "2026-08-01" },
    });
  });

  it("label: varios nombres por coma", () => {
    expect(ok(parseQuery("label:trabajo,personal"))).toEqual({
      type: "field",
      field: "label",
      values: ["trabajo", "personal"],
    });
  });

  it("project: un nombre", () => {
    expect(ok(parseQuery("project:mudanza"))).toEqual({ type: "field", field: "project", values: ["mudanza"] });
  });

  it("completed: true y false", () => {
    expect(ok(parseQuery("completed:true"))).toEqual({ type: "field", field: "completed", value: true });
    expect(ok(parseQuery("completed:false"))).toEqual({ type: "field", field: "completed", value: false });
  });

  it("search: un texto", () => {
    expect(ok(parseQuery("search:alquiler"))).toEqual({ type: "field", field: "search", value: "alquiler" });
  });

  it("recurring: true", () => {
    expect(ok(parseQuery("recurring:true"))).toEqual({ type: "field", field: "recurring", value: true });
  });

  it("subtask: true y false", () => {
    expect(ok(parseQuery("subtask:true"))).toEqual({ type: "field", field: "subtask", value: true });
    expect(ok(parseQuery("subtask:false"))).toEqual({ type: "field", field: "subtask", value: false });
  });

  it("created: fecha exacta y comparadores", () => {
    expect(ok(parseQuery("created:2026-07-01"))).toEqual({
      type: "field",
      field: "created",
      condition: { kind: "exact", date: "2026-07-01" },
    });
    expect(ok(parseQuery("created:after:2026-07-01"))).toEqual({
      type: "field",
      field: "created",
      condition: { kind: "after", date: "2026-07-01" },
    });
  });

  it("no_project: true", () => {
    expect(ok(parseQuery("no_project:true"))).toEqual({ type: "field", field: "no_project", value: true });
  });
});

describe("precedencia y agrupación", () => {
  it("& liga más fuerte que | sin paréntesis", () => {
    const a = ok(parseQuery("priority:1 | priority:2 & due:today"));
    const b = ok(parseQuery("priority:1 | (priority:2 & due:today)"));
    expect(a).toEqual(b);
  });

  it("! niega solo el token que sigue, no toda la expresión", () => {
    const a = ok(parseQuery("!label:espera & due:today"));
    const b = ok(parseQuery("(!label:espera) & due:today"));
    expect(a).toEqual(b);
  });

  it("! sobre un grupo entre paréntesis niega todo el grupo", () => {
    expect(ok(parseQuery("!(label:espera | label:pausada)"))).toEqual({
      type: "not",
      expr: {
        type: "or",
        left: { type: "field", field: "label", values: ["espera"] },
        right: { type: "field", field: "label", values: ["pausada"] },
      },
    });
  });

  it("el caso de referencia del roadmap", () => {
    const ast = ok(parseQuery("(priority:1,2 & due:next7days) & !label:espera"));
    expect(ast).toEqual({
      type: "and",
      left: {
        type: "and",
        left: { type: "field", field: "priority", values: [1, 2] },
        right: { type: "field", field: "due", condition: { kind: "next7days" } },
      },
      right: { type: "not", expr: { type: "field", field: "label", values: ["espera"] } },
    });
  });
});

describe("nombres con espacios entre comillas", () => {
  it("un nombre entre comillas se toma como un solo valor", () => {
    expect(ok(parseQuery('label:"en espera"'))).toEqual({
      type: "field",
      field: "label",
      values: ["en espera"],
    });
  });

  it("sin comillas, la palabra suelta que sigue produce un error de sintaxis en su posición", () => {
    const query = "label:en espera";
    const error = fail(parseQuery(query));
    expect(error.position).toBe(query.indexOf("espera"));
  });

  it("una comilla sin cerrar es un error en la posición de la comilla de apertura", () => {
    const query = 'label:"en espera';
    const error = fail(parseQuery(query));
    expect(error.position).toBe(query.indexOf('"'));
  });
});

describe("errores de sintaxis en español con posición", () => {
  it("campo desconocido", () => {
    const query = "estado:abierto";
    const error = fail(parseQuery(query));
    expect(error.position).toBe(0);
    expect(error.message).toMatch(/[Cc]ampo desconocido/);
  });

  it("paréntesis sin cerrar señala el final de la consulta", () => {
    const query = "(priority:1 & due:today";
    const error = fail(parseQuery(query));
    expect(error.position).toBe(query.length);
  });

  it("consulta vacía", () => {
    const error = fail(parseQuery(""));
    expect(error.position).toBe(0);
  });
});
