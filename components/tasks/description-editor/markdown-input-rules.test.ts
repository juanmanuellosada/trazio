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

/** Igual que `typeChar`, pero para una cadena completa: cada carácter pasa
 * por `handleTextInput`, así que las reglas de entrada en línea (bloque 8)
 * se disparan en el momento real en que se completa el patrón, no antes. */
function typeString(editor: Editor, text: string) {
  for (const char of text) typeChar(editor, char);
}

type TextNodeJSON = { text?: string; marks?: { type: string }[] };

/** Busca, entre los hijos de un nodo de `getJSON()`, el primer nodo de texto
 * con la marca pedida — evita repetir el cast a `TextNodeJSON` en cada test. */
function findMarkedText(nodes: unknown[] | undefined, markType: string): TextNodeJSON | undefined {
  return (nodes as TextNodeJSON[] | undefined)?.find((node) => node.marks?.some((mark) => mark.type === markType));
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

/**
 * Autodetección de marcas en línea dentro de un párrafo ya empezado (bloque
 * 8): a diferencia de las reglas de bloque de arriba, esta familia no
 * necesita ninguna regla de entrada propia — `Bold`, `Italic`, `Strike` y
 * `Code` (del starter kit) y `Highlight`, ya traen la suya activada apenas la
 * extensión se registra (ver el comentario en `extensions.ts`). Estos tests
 * ejercitan esas reglas ya presentes en `descriptionEditorExtensions`, no
 * una implementación nueva.
 */
describe("Autodetección de marcas en línea dentro de un párrafo (bloque 8)", () => {
  it("`**texto**` produce negrita de verdad, sin dejar los asteriscos como texto literal", () => {
    const editor = createHeadlessEditor();
    typeString(editor, "hola **mundo**");

    const json = editor.getJSON();
    const boldNode = findMarkedText(json.content?.[0]?.content, "bold");
    expect(boldNode?.text).toBe("mundo");
    expect(JSON.stringify(json)).not.toContain("**");

    editor.destroy();
  });

  it("`*texto*` produce cursiva de verdad, sin dejar los asteriscos como texto literal", () => {
    const editor = createHeadlessEditor();
    typeString(editor, "hola *mundo*");

    const json = editor.getJSON();
    const italicNode = findMarkedText(json.content?.[0]?.content, "italic");
    expect(italicNode?.text).toBe("mundo");
    expect(JSON.stringify(json)).not.toContain("*mundo*");

    editor.destroy();
  });

  it("`~~texto~~` produce tachado de verdad, sin dejar las virgulillas como texto literal", () => {
    const editor = createHeadlessEditor();
    typeString(editor, "hola ~~mundo~~");

    const json = editor.getJSON();
    const strikeNode = findMarkedText(json.content?.[0]?.content, "strike");
    expect(strikeNode?.text).toBe("mundo");
    expect(JSON.stringify(json)).not.toContain("~~");

    editor.destroy();
  });

  it("código en línea produce la marca de verdad, sin dejar los backticks como texto literal", () => {
    const editor = createHeadlessEditor();
    typeString(editor, "hola `mundo`");

    const json = editor.getJSON();
    const codeNode = findMarkedText(json.content?.[0]?.content, "code");
    expect(codeNode?.text).toBe("mundo");
    expect(JSON.stringify(json)).not.toContain("`");

    editor.destroy();
  });

  it("`==texto==` produce resaltado de verdad, sin dejar los signos igual como texto literal", () => {
    const editor = createHeadlessEditor();
    typeString(editor, "hola ==mundo==");

    const json = editor.getJSON();
    const highlightNode = findMarkedText(json.content?.[0]?.content, "highlight");
    expect(highlightNode?.text).toBe("mundo");
    expect(JSON.stringify(json)).not.toContain("==");

    editor.destroy();
  });

  it("un asterisco suelto ('2 * 3') no dispara cursiva ni desaparece", () => {
    const editor = createHeadlessEditor();
    typeString(editor, "2 * 3");

    const json = editor.getJSON();
    const textNode = json.content?.[0]?.content?.[0] as { text?: string; marks?: unknown[] } | undefined;
    expect(textNode?.text).toBe("2 * 3");
    expect(textNode?.marks ?? []).toHaveLength(0);

    editor.destroy();
  });

  it("la autodetección de bloque y la de marcas en línea conviven: un título puede llevar negrita", () => {
    const editor = createHeadlessEditor();
    typeString(editor, "# ");
    typeString(editor, "hola **mundo**");

    const json = editor.getJSON();
    const firstNode = json.content?.[0];
    expect(firstNode?.type).toBe("heading");
    const boldNode = findMarkedText(firstNode?.content, "bold");
    expect(boldNode?.text).toBe("mundo");
    expect(JSON.stringify(json)).not.toContain("**");

    editor.destroy();
  });

  it("lo guardado sigue siendo el documento estructurado, no texto con marcas de negrita/cursiva/etc.", () => {
    const editor = createHeadlessEditor();
    typeString(editor, "hola **mundo** en cursiva *acá*");

    const json = editor.getJSON();
    expect(json.type).toBe("doc");
    expect(JSON.stringify(json)).not.toMatch(/\*\*mundo\*\*|\*acá\*/);

    editor.destroy();
  });
});
