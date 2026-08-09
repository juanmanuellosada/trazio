import { describe, expect, it } from "vitest";
import { combineSharedContent } from "./combine";

/** Tarea 2.5: las cinco combinaciones de `title`/`text`/`url` que puede mandar el destino de compartir. */
describe("combineSharedContent", () => {
  it("solo text: queda como texto de la tarea, sin descripción", () => {
    expect(combineSharedContent({ title: null, text: "comprar café mañana 9am", url: null })).toEqual({
      text: "comprar café mañana 9am",
      description: null,
    });
  });

  it("solo title: queda como texto de la tarea, sin descripción", () => {
    expect(combineSharedContent({ title: "Comprar café", text: null, url: null })).toEqual({
      text: "Comprar café",
      description: null,
    });
  });

  it("title + url: el título es el texto, el enlace va a la descripción (escenario del spec delta)", () => {
    expect(
      combineSharedContent({ title: "Cómo hacer un espresso", text: null, url: "https://ejemplo.com/espresso" }),
    ).toEqual({
      text: "Cómo hacer un espresso",
      description: "https://ejemplo.com/espresso",
    });
  });

  it("los tres presentes: el título es el texto, el texto y el enlace van a la descripción", () => {
    expect(
      combineSharedContent({
        title: "Cómo hacer un espresso",
        text: "Una guía paso a paso",
        url: "https://ejemplo.com/espresso",
      }),
    ).toEqual({
      text: "Cómo hacer un espresso",
      description: "Una guía paso a paso\n\nhttps://ejemplo.com/espresso",
    });
  });

  it("ninguno de los tres: texto vacío, sin descripción — abre el alta en blanco", () => {
    expect(combineSharedContent({ title: null, text: null, url: null })).toEqual({ text: "", description: null });
  });

  it("solo url: el enlace hace de texto de la tarea", () => {
    expect(combineSharedContent({ title: null, text: null, url: "https://ejemplo.com" })).toEqual({
      text: "https://ejemplo.com",
      description: null,
    });
  });

  it("un texto compartido larguísimo se corta en el título y el resto pasa a la descripción (tarea 3.1)", () => {
    const largo = "a".repeat(600);
    const result = combineSharedContent({ title: null, text: largo, url: null });

    expect(result.text).toHaveLength(500);
    expect(result.text).toBe("a".repeat(500));
    expect(result.description).toBe("a".repeat(100));
  });

  it("el corte por longitud deja el enlace después del sobrante del título", () => {
    const largo = "a".repeat(600);
    const result = combineSharedContent({ title: largo, text: null, url: "https://ejemplo.com" });

    expect(result.text).toHaveLength(500);
    expect(result.description).toBe(`${"a".repeat(100)}\n\nhttps://ejemplo.com`);
  });
});
