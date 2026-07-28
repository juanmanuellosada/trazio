import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Inserta un bloque destacado en el cursor (bloque 7.7, D31: sin extensión libre, nodo propio sobre `@tiptap/core`). */
      insertCallout: () => ReturnType;
    };
  }
}

/**
 * Bloque "destacado" (bloque 7.7, D31): un contenedor con superficie y
 * borde propios para resaltar un párrafo dentro de la descripción, al
 * estilo de un aviso o nota. No existe como extensión oficial de Tiptap —
 * se construye como nodo de bloque sobre `@tiptap/core`, sin variantes de
 * color (la referencia visual no pide más que un único estilo).
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "paragraph+",
  defining: true,
  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "",
        class: "my-2 rounded-lg border-l-4 border-primary bg-surface px-3 py-2",
      }),
      0,
    ];
  },
  addCommands() {
    return {
      insertCallout:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, content: [{ type: "paragraph" }] })
            .run(),
    };
  },
});
