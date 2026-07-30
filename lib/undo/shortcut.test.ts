// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isInsideTiptapEditor, isUndoShortcut } from "./shortcut";

function keyEvent(overrides: Partial<KeyboardEvent>): Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey"> {
  return { key: "z", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...overrides };
}

describe("isUndoShortcut", () => {
  it("Ctrl+Z es deshacer", () => {
    expect(isUndoShortcut(keyEvent({ ctrlKey: true }))).toBe(true);
  });

  it("Cmd+Z (metaKey) es deshacer", () => {
    expect(isUndoShortcut(keyEvent({ metaKey: true }))).toBe(true);
  });

  it("Ctrl+Shift+Z (rehacer convencional) no es deshacer: mejor no reaccionar que reaccionar mal", () => {
    expect(isUndoShortcut(keyEvent({ ctrlKey: true, shiftKey: true }))).toBe(false);
  });

  it("Ctrl+Alt+Z no es deshacer", () => {
    expect(isUndoShortcut(keyEvent({ ctrlKey: true, altKey: true }))).toBe(false);
  });

  it("Z sin Ctrl ni Cmd no es deshacer", () => {
    expect(isUndoShortcut(keyEvent({}))).toBe(false);
  });

  it("Ctrl+A no es deshacer", () => {
    expect(isUndoShortcut(keyEvent({ ctrlKey: true, key: "a" }))).toBe(false);
  });
});

describe("isInsideTiptapEditor", () => {
  it("un elemento dentro de .ProseMirror se detecta como editor Tiptap", () => {
    document.body.innerHTML = '<div class="ProseMirror"><p id="inner">texto</p></div>';
    const inner = document.getElementById("inner")!;
    expect(isInsideTiptapEditor(inner)).toBe(true);
  });

  it("un input común no se detecta como editor Tiptap", () => {
    document.body.innerHTML = '<input id="titulo" />';
    const input = document.getElementById("titulo")!;
    expect(isInsideTiptapEditor(input)).toBe(false);
  });

  it("target nulo no es un editor Tiptap", () => {
    expect(isInsideTiptapEditor(null)).toBe(false);
  });
});
