// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { descriptionEditorExtensions } from "./extensions";

/**
 * Autodetección de markdown en la entrada (bloque 7.5, escenario "Escribir
 * `#` produce un título, no el carácter"): en vez de simular tipeo real
 * sobre el `contentEditable` —jsdom no reproduce con fidelidad cómo el
 * navegador actualiza el DOM al escribir, así que Tiptap/ProseMirror no
 * reciben el evento que dispara sus reglas de entrada por ese camino—, se
 * inserta el texto anterior al disparador con un comando (no pasa por
 * ninguna regla) y se invoca directamente el prop `handleTextInput` que
 * expone el plugin de `prosemirror-inputrules`: es la misma función que el
 * navegador llama al escribir el carácter que completa el patrón, así que
 * ejercita la regla real, no una reimplementación de prueba.
 */
function typeChar(editor: Editor, char: string) {
  const pos = editor.state.selection.from;
  const handled = editor.view.someProp("handleTextInput", (f) =>
    f(editor.view, pos, pos, char, () => editor.state.tr),
  );
  if (!handled) editor.commands.insertContent(char);
}

function createHeadlessEditor() {
  return new Editor({
    element: document.createElement("div"),
    extensions: descriptionEditorExtensions(),
    content: { type: "doc", content: [{ type: "paragraph" }] },
  });
}

describe("Autodetección de markdown en la entrada (bloque 7.5)", () => {
  it("`# ` produce un título de verdad, sin dejar el `#` como texto literal", () => {
    const editor = createHeadlessEditor();
    editor.commands.insertContent("#");
    typeChar(editor, " ");

    const json = editor.getJSON();
    const firstNode = json.content?.[0];
    expect(firstNode?.type).toBe("heading");
    expect(firstNode?.attrs?.level).toBe(1);
    expect(JSON.stringify(json)).not.toContain("#");

    editor.destroy();
  });

  it("`## ` produce un título de nivel 2", () => {
    const editor = createHeadlessEditor();
    editor.commands.insertContent("##");
    typeChar(editor, " ");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode?.type).toBe("heading");
    expect(firstNode?.attrs?.level).toBe(2);

    editor.destroy();
  });

  it("`- ` produce una lista con viñetas, con el documento guardado como nodos, no como texto con marcas", () => {
    const editor = createHeadlessEditor();
    editor.commands.insertContent("-");
    typeChar(editor, " ");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode?.type).toBe("bulletList");
    expect(JSON.stringify(editor.getJSON())).not.toContain("- ");

    editor.destroy();
  });

  it("`[] ` produce una lista de tareas (extensión propia, sin regla de entrada por defecto)", () => {
    const editor = createHeadlessEditor();
    editor.commands.insertContent("[]");
    typeChar(editor, " ");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode?.type).toBe("taskList");
    expect(firstNode?.content?.[0]?.type).toBe("taskItem");

    editor.destroy();
  });

  it("`> ` produce una cita", () => {
    const editor = createHeadlessEditor();
    editor.commands.insertContent(">");
    typeChar(editor, " ");

    const firstNode = editor.getJSON().content?.[0];
    expect(firstNode?.type).toBe("blockquote");

    editor.destroy();
  });

  it("el contenido queda como documento jsonb de Tiptap, no como texto plano con marcas de markdown", () => {
    const editor = createHeadlessEditor();
    editor.commands.insertContent("#");
    typeChar(editor, " ");
    editor.commands.insertContent("Un título");

    const json = editor.getJSON();
    expect(typeof json).toBe("object");
    expect(json.type).toBe("doc");
    expect(json.content?.[0]?.type).toBe("heading");
    const textNode = json.content?.[0]?.content?.[0] as { text?: string } | undefined;
    expect(textNode?.text).toBe("Un título");

    editor.destroy();
  });
});
