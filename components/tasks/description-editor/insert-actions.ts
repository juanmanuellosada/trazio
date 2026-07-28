import type { Editor } from "@tiptap/react";

/**
 * Acciones del menú de insertar (bloque 7.7): tabla, nota al pie, bloque de
 * código, regla horizontal y destacado — cada elemento se agrega en la
 * posición del cursor. Un solo lugar para esta lógica, compartido por el
 * botón "Insertar" de la barra de herramientas (`insert-menu.tsx`) y el
 * submenú "Insertar" del menú contextual (`editor-context-menu.tsx`), para
 * no repetir los mismos cinco comandos en dos componentes.
 */
export type InsertAction = "table" | "footnote" | "codeBlock" | "horizontalRule" | "callout";

export function runInsertAction(editor: Editor, action: InsertAction) {
  const chain = editor.chain().focus();
  switch (action) {
    case "table":
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      return;
    case "footnote":
      chain.insertFootnote().run();
      return;
    case "codeBlock":
      chain.toggleCodeBlock().run();
      return;
    case "horizontalRule":
      chain.setHorizontalRule().run();
      return;
    case "callout":
      chain.insertCallout().run();
      return;
  }
}
