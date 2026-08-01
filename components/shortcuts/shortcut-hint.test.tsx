// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShortcutHint } from "./shortcut-hint";

/**
 * Tests del indicador de atajo compartido (bloque 2, D-B): la regla de
 * forma más importante es que un acorde se vea como dos teclas separadas,
 * nunca como la cadena `"G H"` (requirement "Un acorde se dibuja como dos
 * teclas separadas"). El resto de la definición (qué tecla muestra cada
 * atajo) ya lo prueba `lib/shortcuts/chord.test.ts` sobre la fuente real.
 */
describe("ShortcutHint", () => {
  it("un combo de una sola tecla dibuja una única tecla", () => {
    const { getAllByText, queryByText } = render(<ShortcutHint combo={{ key: "s" }} />);
    expect(getAllByText("S")).toHaveLength(1);
    expect(queryByText("S H")).not.toBeInTheDocument();
  });

  it("un acorde dibuja dos teclas separadas, no una cadena 'G H'", () => {
    const { getByText, queryByText } = render(<ShortcutHint combo={[{ key: "g" }, { key: "h" }]} />);
    expect(getByText("G")).toBeInTheDocument();
    expect(getByText("H")).toBeInTheDocument();
    expect(queryByText("G H")).not.toBeInTheDocument();
    // Cada tecla es su propio elemento `<kbd>`, no dos nodos de texto dentro del mismo.
    expect(getByText("G").tagName).toBe("KBD");
    expect(getByText("H").tagName).toBe("KBD");
    expect(getByText("G")).not.toBe(getByText("H"));
  });

  it("un combo con modificadores dibuja cada tecla por separado (Ctrl, ⇧, tecla)", () => {
    const { getByText } = render(<ShortcutHint combo={{ key: "c", ctrl: true, shift: true }} />);
    expect(getByText("Ctrl")).toBeInTheDocument();
    expect(getByText("⇧")).toBeInTheDocument();
    expect(getByText("C")).toBeInTheDocument();
  });

  it("teclas sin letra imprimible muestran su nombre en español", () => {
    const { getByText } = render(<ShortcutHint combo={{ key: "Delete", shift: true }} />);
    expect(getByText("Supr")).toBeInTheDocument();
  });

  it("el indicador es aria-hidden: es un refuerzo visual del control que ya tiene su propio nombre accesible", () => {
    const { container } = render(<ShortcutHint combo={{ key: "s" }} />);
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });

  it("se oculta por debajo del punto de corte de teléfono (md, el mismo que separa sidebar de escritorio y barra inferior)", () => {
    const { container } = render(<ShortcutHint combo={{ key: "s" }} />);
    const wrapper = container.querySelector("[aria-hidden]");
    expect(wrapper?.className).toContain("hidden");
    expect(wrapper?.className).toContain("md:inline-flex");
  });
});
