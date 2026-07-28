import type { Editor } from "@tiptap/react";
import { toastError } from "@/lib/toast";

function clipboardErrorToast() {
  toastError(
    "No pudimos usar el portapapeles",
    "el navegador no dio acceso a él",
    "Probá con Ctrl+V o Cmd+V en vez del menú.",
  );
}

function selectedText(editor: Editor): string {
  const { from, to, empty } = editor.state.selection;
  if (empty) return "";
  return editor.state.doc.textBetween(from, to, "\n");
}

/** Convierte texto plano a contenido de Tiptap sin ninguna marca (bloque 7.6, "pegar sin formato"): un párrafo por línea, sin pasar por el parser de HTML que interpretaría el texto como si trajera formato. */
function plainTextContent(text: string) {
  return text
    .split("\n")
    .map((line) => (line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" }));
}

export async function copySelection(editor: Editor) {
  const text = selectedText(editor);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    clipboardErrorToast();
  }
}

export async function cutSelection(editor: Editor) {
  const text = selectedText(editor);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    editor.chain().focus().deleteSelection().run();
  } catch {
    clipboardErrorToast();
  }
}

/** Pegar conservando el formato de origen: si el portapapeles trae HTML, lo inserta tal cual (Tiptap lo traduce a su propio esquema); si no, cae a texto plano. */
export async function pasteFromClipboard(editor: Editor) {
  try {
    if (navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          editor.chain().focus().insertContent(await blob.text()).run();
          return;
        }
      }
    }
    const text = await navigator.clipboard.readText();
    if (text) editor.chain().focus().insertContent(plainTextContent(text)).run();
  } catch {
    clipboardErrorToast();
  }
}

/** Pegar sin formato (bloque 7.6, la opción "que más se extraña" según D3 de `design.md`): siempre texto plano, sin importar qué formato traiga el portapapeles. */
export async function pasteAsPlainText(editor: Editor) {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return;
    editor.chain().focus().insertContent(plainTextContent(text)).run();
  } catch {
    clipboardErrorToast();
  }
}
