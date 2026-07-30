import { describe, expect, it } from "vitest";
import { matchesCombo } from "./match";

function keyEvent(overrides: Partial<{ key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean }>) {
  return { key: "s", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...overrides };
}

describe("matchesCombo", () => {
  it("una tecla simple sin modificadores", () => {
    expect(matchesCombo(keyEvent({ key: "s" }), { key: "s" })).toBe(true);
    expect(matchesCombo(keyEvent({ key: "q" }), { key: "s" })).toBe(false);
  });

  it("distingue mayúscula/minúscula del `key` (Shift+S sigue siendo `key: 's'` en el navegador, pero acá se compara sin distinguir)", () => {
    expect(matchesCombo(keyEvent({ key: "S", shiftKey: true }), { key: "s", shift: true })).toBe(true);
  });

  it("ctrl acepta tanto Ctrl como Cmd (metaKey)", () => {
    expect(matchesCombo(keyEvent({ key: "s", ctrlKey: true }), { key: "s", ctrl: true })).toBe(true);
    expect(matchesCombo(keyEvent({ key: "s", metaKey: true }), { key: "s", ctrl: true })).toBe(true);
  });

  it("un modificador de más no matchea (Ctrl+S no es S)", () => {
    expect(matchesCombo(keyEvent({ key: "s", ctrlKey: true }), { key: "s" })).toBe(false);
  });

  it("un modificador de menos no matchea (S no es Shift+S)", () => {
    expect(matchesCombo(keyEvent({ key: "s" }), { key: "s", shift: true })).toBe(false);
  });

  it("combo con Shift+Ctrl+C (copiar enlace del menú contextual)", () => {
    expect(matchesCombo(keyEvent({ key: "c", ctrlKey: true, shiftKey: true }), { key: "c", ctrl: true, shift: true })).toBe(true);
  });

  it("Shift+Supr (eliminar desde el menú contextual)", () => {
    expect(matchesCombo(keyEvent({ key: "Delete", shiftKey: true }), { key: "Delete", shift: true })).toBe(true);
  });
});
