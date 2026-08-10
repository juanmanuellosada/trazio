import { describe, expect, it } from "vitest";
import { validateDescription } from "./description";

describe("validateDescription", () => {
  it("acepta null tal cual", () => {
    expect(validateDescription(null)).toEqual({ ok: true, value: null });
  });

  it("acepta un string tal cual, sin ninguna conversión", () => {
    expect(validateDescription("Llamar al contador\nmañana")).toEqual({
      ok: true,
      value: "Llamar al contador\nmañana",
    });
  });

  it("acepta un documento de Tiptap válido", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hola" }] }] };
    expect(validateDescription(doc)).toEqual({ ok: true, value: doc });
  });

  it("rechaza un objeto que no es un documento de Tiptap válido, sin perder la descripción anterior", () => {
    const result = validateDescription({ text: "hola" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/no es válida/i);
  });

  it("rechaza un doc sin content (array)", () => {
    const result = validateDescription({ type: "doc" });
    expect(result.ok).toBe(false);
  });

  it("rechaza un número y un array", () => {
    expect(validateDescription(42).ok).toBe(false);
    expect(validateDescription([1, 2, 3]).ok).toBe(false);
  });
});
