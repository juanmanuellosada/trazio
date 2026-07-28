// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { descriptionEditorExtensions } from "./extensions";
import { runInsertAction } from "./insert-actions";

/**
 * Menú de insertar (bloque 7.7): tabla, nota al pie, bloque de código,
 * regla horizontal y destacado agregan su elemento en la posición del
 * cursor. Nota al pie y destacado son los dos nodos propios de D31
 * (`footnote.ts`, `callout.ts`, sin extensión libre); acá se verifica el
 * comando de cada uno sobre un editor headless, sin pasar por React.
 */
function createHeadlessEditor() {
  return new Editor({
    element: document.createElement("div"),
    extensions: descriptionEditorExtensions(),
    content: { type: "doc", content: [{ type: "paragraph" }] },
  });
}

describe("runInsertAction (bloque 7.7)", () => {
  it("tabla: agrega una tabla con encabezado en el documento", () => {
    const editor = createHeadlessEditor();
    runInsertAction(editor, "table");

    const hasTable = editor.getJSON().content?.some((node) => node.type === "table");
    expect(hasTable).toBe(true);
    editor.destroy();
  });

  it("bloque de código: convierte el bloque actual en código", () => {
    const editor = createHeadlessEditor();
    runInsertAction(editor, "codeBlock");

    expect(editor.getJSON().content?.[0]?.type).toBe("codeBlock");
    editor.destroy();
  });

  it("regla horizontal: agrega el separador", () => {
    const editor = createHeadlessEditor();
    runInsertAction(editor, "horizontalRule");

    const hasRule = editor.getJSON().content?.some((node) => node.type === "horizontalRule");
    expect(hasRule).toBe(true);
    editor.destroy();
  });

  it("destacado: agrega el bloque de tipo callout", () => {
    const editor = createHeadlessEditor();
    runInsertAction(editor, "callout");

    const hasCallout = editor.getJSON().content?.some((node) => node.type === "callout");
    expect(hasCallout).toBe(true);
    editor.destroy();
  });

  it("nota al pie: agrega la referencia en el texto y su ítem en la lista al final del documento", () => {
    const editor = createHeadlessEditor();
    runInsertAction(editor, "footnote");

    const json = editor.getJSON();
    const hasReference = json.content?.some((node) =>
      node.content?.some((inline) => inline.type === "footnoteReference"),
    );
    const footnoteList = json.content?.find((node) => node.type === "footnoteList");

    expect(hasReference).toBe(true);
    expect(footnoteList?.content?.[0]?.type).toBe("footnoteItem");
    editor.destroy();
  });

  it("nota al pie: la segunda referencia agrega un segundo ítem a la misma lista, no una lista nueva", () => {
    const editor = createHeadlessEditor();
    runInsertAction(editor, "footnote");
    runInsertAction(editor, "footnote");

    const json = editor.getJSON();
    const footnoteLists = json.content?.filter((node) => node.type === "footnoteList");

    expect(footnoteLists).toHaveLength(1);
    expect(footnoteLists?.[0]?.content).toHaveLength(2);
    editor.destroy();
  });
});
