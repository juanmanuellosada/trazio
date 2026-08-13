import { Extension, wrappingInputRule, type AnyExtension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
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
import { handleLinkModifierClick } from "./link-click";

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
 * Abre un enlace de la descripción con Ctrl+clic (Cmd+clic en Mac) —
 * `abrir-un-enlace-de-la-descripcion`, D1 y D2 de `design.md`: un
 * `handleClick` de ProseMirror, no `handleDOMEvents.mousedown` (cancelaría
 * también el arrastre y el origen de la selección de texto) ni
 * `openOnClick` de `@tiptap/extension-link` (abriría también con el clic
 * simple, que es el gesto de colocar el cursor). Va acá, en `extensions.ts`,
 * y no en `editorProps` de `TaskDescriptionEditor`, por dos razones: este
 * archivo alimenta también la vista pública de solo lectura
 * (`ReadOnlyDescription`), de ahí que `handleLinkModifierClick` arranque
 * con la guarda `view.editable` —la misma que usa el `clickHandler` de
 * `@tiptap/extension-link` para no duplicar su apertura nativa—; y un
 * plugin es alcanzable desde un test headless con
 * `editor.view.someProp("handleClick", ...)`, mientras que desde
 * `editorProps` de React no hay forma de llegar al `view` en un test. Ojo:
 * un `handleClick` puesto en `editorProps` le ganaría a este plugin, porque
 * `someProp` consulta primero los props directos del `view`.
 */
const OpenLinkOnModifierClick = Extension.create({
  name: "openLinkOnModifierClick",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleClick: (view, _pos, event) => handleLinkModifierClick(view, event),
        },
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
 * extension names found: ['link']". `openOnClick` sigue en `false` a
 * propósito: el clic simple coloca el cursor, y quien abre el enlace es
 * `OpenLinkOnModifierClick` de más arriba, con Ctrl+clic. `underline`
 * también se desactiva: el starter kit lo trae, pero no está en la lista
 * pedida ni en D31, y dejarlo activo sin un botón que lo controle es una
 * función escondida (accesible solo por `Mod-U`) que nadie pidió. Los
 * títulos se acotan a tres niveles, los mismos que ofrece la barra de
 * herramientas.
 *
 * Notas al pie y destacado no son extensiones instaladas (D31: no existen
 * como paquete libre) — son nodos propios en `footnote.ts` y `callout.ts`.
 *
 * Autodetección en línea (bloque 8): negrita (`**`/`__`), cursiva (`*`/`_`),
 * tachado (`~~`), código (backtick) y resaltado (`==`) no necesitan ninguna
 * regla propia como la de `TaskListWithMarkdown` de arriba — `Bold`,
 * `Italic`, `Strike` y `Code` del starter kit, y `Highlight`, ya traen su
 * `addInputRules()` activado por defecto en cuanto la extensión se registra
 * sin `false`. Un asterisco suelto ("2 * 3") no dispara nada porque las
 * regex de negrita y cursiva exigen el par de marcadores completo.
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
    OpenLinkOnModifierClick,
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
