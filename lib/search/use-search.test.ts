import { describe, expect, it } from "vitest";
import { classifySearchTerm } from "./use-search";

/**
 * Tests de la detección del buscador (tareas 1.3 y 2.2 de
 * `openspec/changes/buscador-con-lenguaje-de-consulta/tasks.md`, D-A/D-B de
 * design.md): puramente sobre `classifySearchTerm`, sin red ni React —
 * es la misma función que usa `useSearch` para decidir el modo, así que
 * probarla acá cubre la detección sin duplicar el parser.
 */
describe("classifySearchTerm", () => {
  it("una consulta válida se resuelve como consulta, no como texto", () => {
    const result = classifySearchTerm("priority:1 & due:overdue");
    expect(result.mode).toBe("consulta");
  });

  it("un texto común sigue siendo texto", () => {
    expect(classifySearchTerm("alquiler")).toEqual({ mode: "texto" });
  });

  it.each(["label", "due"])(
    "una palabra suelta que se parece a un campo (\"%s\") cae en texto: le falta la forma campo:valor (D-A, caso borde)",
    (word) => {
      expect(classifySearchTerm(word)).toEqual({ mode: "texto" });
    },
  );

  it("un paréntesis sin cerrar es un error de sintaxis, nunca cae en silencio a texto (D-B)", () => {
    const result = classifySearchTerm("(priority:1 & due:today");
    expect(result.mode).toBe("error");
    if (result.mode === "error") {
      expect(result.error.message).toBe("Falta un paréntesis de cierre.");
    }
  });

  it("un valor inválido en un campo real también es un error, no texto (D-B)", () => {
    const result = classifySearchTerm("priority:9");
    expect(result.mode).toBe("error");
    if (result.mode === "error") {
      expect(result.error.message).toBe("La prioridad tiene que ser un valor entre 1 y 4.");
    }
  });

  it('"14:30" es texto: "14" no es un campo conocido, no alcanza con que haya ":"', () => {
    expect(classifySearchTerm("14:30")).toEqual({ mode: "texto" });
  });

  it('"nota: comprar" es texto: "nota" no es un campo conocido', () => {
    expect(classifySearchTerm("nota: comprar")).toEqual({ mode: "texto" });
  });
});
