import { describe, expect, it } from "vitest";
import { CHORD_KEY_BY_DESTINATION, CHORD_ROUTES, CHORD_TRIGGER_KEY, chordDestinationFor } from "./chord";

describe("chordDestinationFor", () => {
  it("reconoce las siete teclas del acorde G", () => {
    expect(chordDestinationFor("i")).toBe("bandeja");
    expect(chordDestinationFor("h")).toBe("hoy");
    expect(chordDestinationFor("p")).toBe("proximos");
    expect(chordDestinationFor("e")).toBe("etiquetas");
    expect(chordDestinationFor("c")).toBe("completado");
    expect(chordDestinationFor("a")).toBe("habitos");
    expect(chordDestinationFor("f")).toBe("filtros");
  });

  it("sin distinguir mayúscula (Shift+letra en el navegador sigue dando `key` en minúscula salvo mayúscula real, pero por las dudas)", () => {
    expect(chordDestinationFor("I")).toBe("bandeja");
  });

  it("una tecla ajena al acorde no reconoce ningún destino (requirement: lo cancela sin disparar su propio atajo)", () => {
    expect(chordDestinationFor("q")).toBeNull();
    expect(chordDestinationFor("Escape")).toBeNull();
  });

  it("G A (Hábitos) navega a /habitos (tarea 5.5)", () => {
    expect(CHORD_ROUTES.habitos).toBe("/habitos");
  });

  it("el resto de los destinos también tiene ruta", () => {
    expect(CHORD_ROUTES.bandeja).toBe("/bandeja");
    expect(CHORD_ROUTES.hoy).toBe("/hoy");
    expect(CHORD_ROUTES.proximos).toBe("/proximos");
    expect(CHORD_ROUTES.etiquetas).toBe("/etiquetas");
    expect(CHORD_ROUTES.completado).toBe("/completado");
  });

  it("G F (Filtros) navega a /filtros (filtros-alcanzables, tarea 1.2)", () => {
    expect(CHORD_ROUTES.filtros).toBe("/filtros");
  });
});

describe("CHORD_KEY_BY_DESTINATION (bloque 2, D-C)", () => {
  it("es el inverso exacto de la tecla que de verdad navega a cada destino", () => {
    // Recorre `CHORD_KEY_BY_DESTINATION` y confirma, para cada destino, que
    // su tecla vuelve a resolver al mismo destino vía `chordDestinationFor`
    // (la función que realmente dispara la navegación): así el indicador
    // nunca puede mostrar una tecla que no sea la registrada de verdad.
    for (const [destination, key] of Object.entries(CHORD_KEY_BY_DESTINATION)) {
      expect(chordDestinationFor(key)).toBe(destination);
    }
  });

  it("las teclas nuevas de Hoy y Próximos son H y P (tarea 1.1)", () => {
    expect(CHORD_KEY_BY_DESTINATION.hoy).toBe("h");
    expect(CHORD_KEY_BY_DESTINATION.proximos).toBe("p");
  });

  it("la tecla de Etiquetas es E (etiquetas-con-lugar-propio, tarea 1.1)", () => {
    expect(CHORD_KEY_BY_DESTINATION.etiquetas).toBe("e");
  });

  it("la tecla de Filtros es F (filtros-alcanzables, tarea 1.2)", () => {
    expect(CHORD_KEY_BY_DESTINATION.filtros).toBe("f");
  });
});

describe("CHORD_TRIGGER_KEY", () => {
  it("es la tecla que abre el acorde", () => {
    expect(CHORD_TRIGGER_KEY).toBe("g");
  });
});
