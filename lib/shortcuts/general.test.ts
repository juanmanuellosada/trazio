import { describe, expect, it } from "vitest";
import { GENERAL_SHORTCUTS } from "./general";

/**
 * `GENERAL_SHORTCUTS` es la única definición de estos tres atajos: la
 * consume `shortcut-provider.tsx` para disparar la acción y el indicador de
 * atajo (bloque 2, D-C) para dibujarse. Este test fija las teclas para que
 * un cambio accidental se note acá y no solo como una tecla que dejó de
 * andar en el navegador.
 */
describe("GENERAL_SHORTCUTS", () => {
  it("buscar es S, agregar tarea es Q, agregar evento es E", () => {
    expect(GENERAL_SHORTCUTS.buscar).toEqual({ key: "s" });
    expect(GENERAL_SHORTCUTS.agregarTarea).toEqual({ key: "q" });
    expect(GENERAL_SHORTCUTS.agregarEvento).toEqual({ key: "e" });
  });
});
