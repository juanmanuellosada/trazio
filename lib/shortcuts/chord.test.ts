import { describe, expect, it } from "vitest";
import { CHORD_ROUTES, chordDestinationFor } from "./chord";

describe("chordDestinationFor", () => {
  it("reconoce las cinco teclas del acorde G", () => {
    expect(chordDestinationFor("i")).toBe("bandeja");
    expect(chordDestinationFor("t")).toBe("hoy");
    expect(chordDestinationFor("u")).toBe("proximos");
    expect(chordDestinationFor("c")).toBe("completado");
    expect(chordDestinationFor("a")).toBe("habitos");
  });

  it("sin distinguir mayúscula (Shift+letra en el navegador sigue dando `key` en minúscula salvo mayúscula real, pero por las dudas)", () => {
    expect(chordDestinationFor("I")).toBe("bandeja");
  });

  it("una tecla ajena al acorde no reconoce ningún destino (requirement: lo cancela sin disparar su propio atajo)", () => {
    expect(chordDestinationFor("q")).toBeNull();
    expect(chordDestinationFor("Escape")).toBeNull();
  });

  it("G A (Hábitos) no tiene ruta todavía: fase 3 (bloque 7.5)", () => {
    expect(CHORD_ROUTES.habitos).toBeNull();
  });

  it("el resto de los destinos sí tiene ruta", () => {
    expect(CHORD_ROUTES.bandeja).toBe("/bandeja");
    expect(CHORD_ROUTES.hoy).toBe("/hoy");
    expect(CHORD_ROUTES.proximos).toBe("/proximos");
    expect(CHORD_ROUTES.completado).toBe("/completado");
  });
});
