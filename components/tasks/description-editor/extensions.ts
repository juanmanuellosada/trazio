import { wrappingInputRule, type AnyExtension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { Callout } from "./callout";
import { FootnoteItem, FootnoteList, FootnoteReference } from "./footnote";

/**
 * Autodetección de markdown para listas de tareas (bloque 7.5): a
 * diferencia de `bulletList`/`orderedList`/`blockquote`/`heading`, que ya
 * traen su propia regla de entrada en `@tiptap/extension-task-item` no
 * incluye ninguna — `- [ ] ` o `[] ` no producen nada sin esto.
 */
const TaskListWithMarkdown = TaskList.extend({
  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\s*(\[([ xX]?)\])\s$/,
        type: this.type,
      }),
    ];
  },
});

/**
 * Extensiones del editor de descripción (bloque 7.2, decisión D31): además
 * del `starter-kit` (que ya trae títulos, negrita, cursiva, tachado, código
 * en línea, bloque de código, regla horizontal y cita — no se reinstala
 * nada de eso), suma resaltado, listas de tareas y tabla. El link del
 * starter kit se desactiva (`link: false`) porque se registra aparte, con
 * la configuración propia (`openOnClick: false`, el diálogo de
 * `link-dialog.tsx` reemplaza a `window.prompt`) — antes de este cambio
 * las dos versiones convivían y producían el aviso de consola "Duplicate
 * extension names found: ['link']". `underline` también se desactiva: el
 * starter kit lo trae, pero no está en la lista pedida ni en D31, y
 * dejarlo activo sin un botón que lo controle es una función escondida
 * (accesible solo por `Mod-U`) que nadie pidió. Los títulos se acotan a
 * tres niveles, los mismos que ofrece la barra de herramientas.
 *
 * Notas al pie y destacado no son extensiones instaladas (D31: no existen
 * como paquete libre) — son nodos propios en `footnote.ts` y `callout.ts`.
 *
 * Exportada como función (no array suelto) para que cada consumidor —el
 * editor y los tests de autodetección de markdown— construya su propia
 * instancia: las extensiones de Tiptap llevan estado interno y no se
 * comparten entre editores.
 */
export function descriptionEditorExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({ link: false, underline: false, heading: { levels: [1, 2, 3] } }),
    Link.configure({ openOnClick: false }),
    Highlight,
    TaskListWithMarkdown,
    TaskItem,
    Table,
    TableRow,
    TableHeader,
    TableCell,
    Callout,
    FootnoteReference,
    FootnoteItem,
    FootnoteList,
  ];
}
