// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";
import { descriptionEditorExtensions } from "./extensions";
import { handleLinkModifierClick, modifierClickAnchor, openableHref, openLinkInNewTab } from "./link-click";

/**
 * Dispara un `click` real sobre `target` y captura el evento que llega a
 * `root` por burbujeo, como pediría un test de integración: los tests de
 * este módulo necesitan un `MouseEvent` con `target` resuelto por el DOM
 * (nunca se puede fijar `target` desde el constructor de `MouseEvent`), así
 * que se dispara y se captura en vez de construir el evento a mano.
 * `preventDefault` corta la navegación real que jsdom intenta al hacer
 * clic sobre un `<a href>` de verdad —acá se ejercitan las funciones
 * puras, no el `preventDefault` que hace ProseMirror en el editor real
 * cuando `handleClick` devuelve `true` (D1 de `design.md`).
 */
function dispatchClick(root: HTMLElement, target: HTMLElement, init: MouseEventInit): MouseEvent {
  let captured: MouseEvent | null = null;
  const listener = (event: Event) => {
    captured = event as MouseEvent;
    event.preventDefault();
  };
  root.addEventListener("click", listener);
  target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ...init }));
  root.removeEventListener("click", listener);
  if (!captured) throw new Error("el clic no llegó a root");
  return captured;
}

describe("openableHref (D4 de design.md)", () => {
  it.each(["http://trazio.com.ar", "https://trazio.com.ar"])("%s pasa la lista blanca", (href) => {
    expect(openableHref(href)).toBe(href);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "mailto:a@b.com",
    "trazio.com.ar",
    "//evil.com",
    "",
    "   ",
  ])("%s da null", (href) => {
    expect(openableHref(href)).toBeNull();
  });

  it("null y undefined dan null", () => {
    expect(openableHref(null)).toBeNull();
    expect(openableHref(undefined)).toBeNull();
  });
});

describe("openLinkInNewTab", () => {
  it("llama a window.open con el href, _blank y noopener,noreferrer", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    openLinkInNewTab("https://trazio.com.ar");

    expect(openSpy).toHaveBeenCalledWith("https://trazio.com.ar", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });
});

describe("modifierClickAnchor (D3 de design.md)", () => {
  function buildDom() {
    const root = document.createElement("div");
    root.innerHTML = '<p>texto <a href="https://trazio.com.ar">enlace <strong>anidado</strong></a></p>';
    return root;
  }

  it("Ctrl+clic sobre el <a> lo devuelve", () => {
    const root = buildDom();
    const anchor = root.querySelector("a")!;
    const event = dispatchClick(root, anchor, { button: 0, ctrlKey: true });

    expect(modifierClickAnchor(root, event)).toBe(anchor);
  });

  it("Cmd+clic (metaKey) sobre el <a> lo devuelve", () => {
    const root = buildDom();
    const anchor = root.querySelector("a")!;
    const event = dispatchClick(root, anchor, { button: 0, metaKey: true });

    expect(modifierClickAnchor(root, event)).toBe(anchor);
  });

  it("un target anidado dentro del <a> sube con closest", () => {
    const root = buildDom();
    const anchor = root.querySelector("a")!;
    const nested = root.querySelector("strong")!;
    const event = dispatchClick(root, nested, { button: 0, ctrlKey: true });

    expect(modifierClickAnchor(root, event)).toBe(anchor);
  });

  it("clic sin modificador da null", () => {
    const root = buildDom();
    const anchor = root.querySelector("a")!;
    const event = dispatchClick(root, anchor, { button: 0 });

    expect(modifierClickAnchor(root, event)).toBeNull();
  });

  it("button distinto de 0 (clic del medio) da null", () => {
    const root = buildDom();
    const anchor = root.querySelector("a")!;
    const event = dispatchClick(root, anchor, { button: 1, ctrlKey: true });

    expect(modifierClickAnchor(root, event)).toBeNull();
  });

  it("clic sobre texto sin enlace da null", () => {
    const root = buildDom();
    const paragraph = root.querySelector("p")!;
    const event = dispatchClick(root, paragraph, { button: 0, ctrlKey: true });

    expect(modifierClickAnchor(root, event)).toBeNull();
  });

  it("un <a> fuera de root da null", () => {
    const root = buildDom();
    const outside = document.createElement("div");
    outside.innerHTML = '<a href="https://trazio.com.ar">afuera</a>';
    const anchor = outside.querySelector("a")!;
    const event = dispatchClick(outside, anchor, { button: 0, ctrlKey: true });

    expect(modifierClickAnchor(root, event)).toBeNull();
  });
});

describe("handleLinkModifierClick con un editor real", () => {
  function createEditor(editable = true) {
    return new Editor({
      element: document.createElement("div"),
      extensions: descriptionEditorExtensions(),
      editable,
      content: { type: "doc", content: [{ type: "paragraph" }] },
    });
  }

  /** Mismo camino que `handleLinkConfirm` de `task-description-editor.tsx`: `insertContent` con la marca ya puesta, que saltea la validación `isAllowedUri` del comando `setLink` (D4 de `design.md`). */
  function insertLinkText(editor: Editor, href: string) {
    editor
      .chain()
      .insertContent({ type: "text", text: "enlace", marks: [{ type: "link", attrs: { href } }] })
      .run();
  }

  it("abre una sola vez con el href correcto", () => {
    const editor = createEditor();
    insertLinkText(editor, "https://trazio.com.ar");
    const anchor = editor.view.dom.querySelector("a")!;
    const event = dispatchClick(editor.view.dom, anchor, { button: 0, ctrlKey: true });
    const open = vi.fn();

    expect(handleLinkModifierClick(editor.view, event, open)).toBe(true);
    expect(open).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith("https://trazio.com.ar");

    editor.destroy();
  });

  it("con la vista no editable devuelve false y no abre", () => {
    const editor = createEditor(false);
    insertLinkText(editor, "https://trazio.com.ar");
    const anchor = editor.view.dom.querySelector("a")!;
    const event = dispatchClick(editor.view.dom, anchor, { button: 0, ctrlKey: true });
    const open = vi.fn();

    expect(handleLinkModifierClick(editor.view, event, open)).toBe(false);
    expect(open).not.toHaveBeenCalled();

    editor.destroy();
  });

  it("sin modificador no abre", () => {
    const editor = createEditor();
    insertLinkText(editor, "https://trazio.com.ar");
    const anchor = editor.view.dom.querySelector("a")!;
    const event = dispatchClick(editor.view.dom, anchor, { button: 0 });
    const open = vi.fn();

    expect(handleLinkModifierClick(editor.view, event, open)).toBe(false);
    expect(open).not.toHaveBeenCalled();

    editor.destroy();
  });

  it("con una marca href 'javascript:alert(1)' devuelve true y no abre", () => {
    const editor = createEditor();
    insertLinkText(editor, "javascript:alert(1)");
    const anchor = editor.view.dom.querySelector("a")!;
    const event = dispatchClick(editor.view.dom, anchor, { button: 0, ctrlKey: true });
    const open = vi.fn();

    expect(handleLinkModifierClick(editor.view, event, open)).toBe(true);
    expect(open).not.toHaveBeenCalled();

    editor.destroy();
  });
});
