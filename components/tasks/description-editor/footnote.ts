import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    footnote: {
      /** Inserta una referencia de nota al pie en el cursor y agrega su ítem a la lista del final del documento (decisión D31: sin extensión libre, nodo propio sobre `@tiptap/core`). */
      insertFootnote: () => ReturnType;
    };
  }
}

let footnoteSeq = 0;
function nextFootnoteId(): string {
  footnoteSeq += 1;
  return `fn-${Date.now().toString(36)}-${footnoteSeq}`;
}

/** Ítem de la lista de notas al pie (bloque 7.7): un párrafo por nota, identificado por el mismo `id` que su referencia en el texto. */
export const FootnoteItem = Node.create({
  name: "footnoteItem",
  content: "paragraph+",
  defining: true,
  addAttributes() {
    return { id: { default: null } };
  },
  parseHTML() {
    return [{ tag: "li[data-footnote-item]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "li",
      mergeAttributes(HTMLAttributes, { "data-footnote-item": "", id: `fn-${node.attrs.id}` }),
      0,
    ];
  },
});

/** Lista de notas al pie (bloque 7.7): un único nodo al final del documento, con un `footnoteItem` por referencia. */
export const FootnoteList = Node.create({
  name: "footnoteList",
  group: "block",
  content: "footnoteItem+",
  isolating: true,
  parseHTML() {
    return [{ tag: "ol[data-footnote-list]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "ol",
      mergeAttributes(HTMLAttributes, {
        "data-footnote-list": "",
        class: "mt-4 space-y-1 border-t border-border pt-3 text-sm text-text-secondary",
      }),
      0,
    ];
  },
});

/**
 * Referencia de nota al pie en el texto (bloque 7.7, D31): nodo inline
 * atómico que se renderiza como un número en superíndice enlazado al ítem
 * correspondiente de `FootnoteList`. `insertFootnote()` (declarado acá
 * porque es el comando que crea las tres piezas juntas) inserta la
 * referencia en el cursor y, si todavía no existe, crea la lista al final
 * del documento con su primer ítem; si ya existe, le agrega el ítem nuevo.
 * La numeración se fija en el momento de crear cada nota y no se
 * recalcula después: renumerar dinámicamente ante cada edición es una
 * complejidad que esta app no necesita (uso ocasional en descripciones de
 * tarea, no un documento largo con reordenamientos frecuentes).
 */
export const FootnoteReference = Node.create({
  name: "footnoteReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      id: { default: null },
      number: { default: 1 },
    };
  },
  parseHTML() {
    return [{ tag: "sup[data-footnote-id]" }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return [
      "sup",
      mergeAttributes(HTMLAttributes, {
        "data-footnote-id": node.attrs.id,
        class: "text-primary",
      }),
      ["a", { href: `#fn-${node.attrs.id}` }, String(node.attrs.number)],
    ];
  },
  addCommands() {
    return {
      // Muta `tr` (la transacción del comando dentro de la cadena, no una
      // nueva vía `state.tr`) y no llama a `view.dispatch()` a mano: eso es
      // trabajo de quien orquesta la cadena (`CommandManager`) una vez que
      // todos los comandos encadenados terminaron. Despachar acá adentro
      // hacía que la cadena aplicara después su propia transacción sobre un
      // estado que ya había avanzado por este dispatch manual — "Applying a
      // mismatched transaction" de ProseMirror.
      insertFootnote:
        () =>
        ({ state, tr }) => {
          const { schema } = state;
          let maxNumber = 0;
          state.doc.descendants((node) => {
            if (node.type.name === "footnoteReference") {
              maxNumber = Math.max(maxNumber, node.attrs.number as number);
            }
          });

          const id = nextFootnoteId();
          const number = maxNumber + 1;
          const reference = schema.nodes.footnoteReference.create({ id, number });
          const item = schema.nodes.footnoteItem.create({ id }, schema.nodes.paragraph.create());

          tr.replaceSelectionWith(reference, false);

          let listPos: number | null = null;
          tr.doc.descendants((node, pos) => {
            if (node.type.name === "footnoteList") listPos = pos;
          });

          if (listPos !== null) {
            const listNode = tr.doc.nodeAt(listPos);
            if (listNode) tr.insert(listPos + listNode.nodeSize - 1, item);
          } else {
            const list = schema.nodes.footnoteList.create(null, item);
            tr.insert(tr.doc.content.size, list);
          }

          return true;
        },
    };
  },
});
