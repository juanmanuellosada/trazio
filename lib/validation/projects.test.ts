import { describe, expect, it } from "vitest";
import { projectFormSchema } from "./projects";

const BASE = { name: "Proyecto", icon: undefined, description: undefined, isFavorite: false };

describe("projectFormSchema — color (D19/D29)", () => {
  it("acepta un id de la paleta fija", () => {
    const result = projectFormSchema.safeParse({ ...BASE, color: "verde" });
    expect(result.success).toBe(true);
  });

  it("acepta un color personalizado que da contraste contra los dos temas", () => {
    // #6366F1: 4.2:1 contra el fondo claro, 3.48:1 contra el oscuro — supera
    // el mínimo de 3:1 en los dos.
    const result = projectFormSchema.safeParse({ ...BASE, color: "#6366F1" });
    expect(result.success).toBe(true);
  });

  it("rechaza un color personalizado sin contraste suficiente en algún tema (protege D19)", () => {
    // #FFFFFF: prácticamente invisible contra el fondo claro (~1:1).
    const result = projectFormSchema.safeParse({ ...BASE, color: "#FFFFFF" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/no se lee bien contra el fondo/i);
    }
  });

  it("rechaza un color que no es ni un id de la paleta ni un hexadecimal válido", () => {
    const result = projectFormSchema.safeParse({ ...BASE, color: "azul-marino" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/no es válido/i);
    }
  });

  it("rechaza un hexadecimal mal formado (faltan dígitos)", () => {
    const result = projectFormSchema.safeParse({ ...BASE, color: "#FFF" });
    expect(result.success).toBe(false);
  });
});
