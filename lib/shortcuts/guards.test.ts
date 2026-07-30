// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isBlockedByFocusGuard, isTextInputTarget } from "./guards";

describe("isTextInputTarget", () => {
  it("un input es un campo de texto", () => {
    document.body.innerHTML = '<input id="a" />';
    expect(isTextInputTarget(document.getElementById("a"))).toBe(true);
  });

  it("un textarea es un campo de texto", () => {
    document.body.innerHTML = '<textarea id="a"></textarea>';
    expect(isTextInputTarget(document.getElementById("a"))).toBe(true);
  });

  it("un contenteditable es un campo de texto", () => {
    document.body.innerHTML = '<div id="a" contenteditable="true"></div>';
    expect(isTextInputTarget(document.getElementById("a"))).toBe(true);
  });

  it("un botón no es un campo de texto", () => {
    document.body.innerHTML = '<button id="a">Hola</button>';
    expect(isTextInputTarget(document.getElementById("a"))).toBe(false);
  });

  it("target nulo no es un campo de texto", () => {
    expect(isTextInputTarget(null)).toBe(false);
  });
});

describe("isBlockedByFocusGuard", () => {
  it("una tecla suelta en un input queda bloqueada", () => {
    document.body.innerHTML = '<input id="a" />';
    const target = document.getElementById("a");
    expect(isBlockedByFocusGuard({ target, ctrlKey: false, metaKey: false })).toBe(true);
  });

  it("Ctrl+tecla en un input NO queda bloqueada", () => {
    document.body.innerHTML = '<input id="a" />';
    const target = document.getElementById("a");
    expect(isBlockedByFocusGuard({ target, ctrlKey: true, metaKey: false })).toBe(false);
  });

  it("Cmd (metaKey)+tecla en un input NO queda bloqueada", () => {
    document.body.innerHTML = '<input id="a" />';
    const target = document.getElementById("a");
    expect(isBlockedByFocusGuard({ target, ctrlKey: false, metaKey: true })).toBe(false);
  });

  it("una tecla suelta fuera de un campo de texto no queda bloqueada", () => {
    document.body.innerHTML = '<button id="a">Hola</button>';
    const target = document.getElementById("a");
    expect(isBlockedByFocusGuard({ target, ctrlKey: false, metaKey: false })).toBe(false);
  });
});
