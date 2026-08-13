"use client";

import type { ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Check,
  ClipboardPaste,
  ClipboardType,
  Code,
  Code2,
  Copy,
  ExternalLink,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Link as LinkIcon,
  Megaphone,
  Minus,
  Quote,
  Scissors,
  Strikethrough,
  Superscript,
  Table as TableIcon,
  Type,
} from "lucide-react";
import { AppContextMenu, type AppContextMenuEntry } from "@/components/primitives/context-menu";
import { runInsertAction } from "./insert-actions";
import { copySelection, cutSelection, pasteAsPlainText, pasteFromClipboard } from "./clipboard-actions";
import { openableHref, openLinkInNewTab } from "./link-click";

function checkIcon(active: boolean) {
  return active ? <Check className="size-3.5" /> : <span className="size-3.5" />;
}

/**
 * Menú contextual del editor de descripción (bloque 7.6, D3 de
 * `design.md`): reemplaza el menú nativo del navegador con submenús de
 * formato, párrafo e insertar, y las opciones de portapapeles —incluida
 * "pegar sin formato"—. Se apoya en `AppContextMenu` (bloque 2.4), que
 * resuelve abrir con clic derecho, navegar con flechas y cerrar con
 * `Escape`; acá solo se arma el árbol de opciones específico del editor.
 */
export function EditorContextMenu({
  editor,
  onOpenLinkDialog,
  children,
}: {
  editor: Editor;
  onOpenLinkDialog: () => void;
  children: ReactNode;
}) {
  const activeHeading = ([1, 2, 3] as const).find((level) => editor.isActive("heading", { level }));

  // "Abrir enlace" (`abrir-un-enlace-de-la-descripcion`, D6 de `design.md`):
  // el camino sin modificador, usable con pantalla táctil y con teclado —
  // en un teléfono no hay Ctrl. Solo aparece con el cursor dentro de un
  // enlace cuyo href es abrible; si no corresponde, no se agrega al array
  // (no hay campo para ocultar una entrada de `AppContextMenuEntry`).
  //
  // `useEditorState` en vez de calcular esto en el cuerpo del render: en
  // Tiptap 3, `useEditor` ya no re-renderiza el componente en cada
  // transacción, así que `editor.isActive("link")` leído directo acá
  // quedaría congelado en el valor del primer render y nunca reflejaría
  // dónde está el cursor ahora. `useEditorState` se suscribe a las
  // transacciones y solo re-renderiza cuando el resultado del selector
  // cambia.
  const openableLinkHref = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current.isActive("link") ? openableHref(current.getAttributes("link").href as string) : null,
  });
  const openLinkEntries: AppContextMenuEntry[] = openableLinkHref
    ? [
        {
          label: "Abrir enlace",
          icon: <ExternalLink className="size-3.5" />,
          onSelect: () => openLinkInNewTab(openableLinkHref),
        },
        { type: "separator" },
      ]
    : [];

  const entries: AppContextMenuEntry[] = [
    ...openLinkEntries,
    {
      type: "submenu",
      label: "Formato",
      icon: <Type className="size-3.5" />,
      items: [
        { label: "Negrita", icon: <Bold className="size-3.5" />, onSelect: () => editor.chain().focus().toggleBold().run() },
        { label: "Itálica", icon: <Italic className="size-3.5" />, onSelect: () => editor.chain().focus().toggleItalic().run() },
        { label: "Tachado", icon: <Strikethrough className="size-3.5" />, onSelect: () => editor.chain().focus().toggleStrike().run() },
        { label: "Resaltado", icon: <Highlighter className="size-3.5" />, onSelect: () => editor.chain().focus().toggleHighlight().run() },
        { label: "Código", icon: <Code className="size-3.5" />, onSelect: () => editor.chain().focus().toggleCode().run() },
        { label: "Enlace", icon: <LinkIcon className="size-3.5" />, onSelect: onOpenLinkDialog },
      ],
    },
    {
      type: "submenu",
      label: "Párrafo",
      icon: <Heading1 className="size-3.5" />,
      items: [
        {
          label: "Texto",
          icon: checkIcon(activeHeading == null),
          onSelect: () => editor.chain().focus().setParagraph().run(),
        },
        {
          label: "Título 1",
          icon: <Heading1 className="size-3.5" />,
          onSelect: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          label: "Título 2",
          icon: <Heading2 className="size-3.5" />,
          onSelect: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          label: "Título 3",
          icon: <Heading3 className="size-3.5" />,
          onSelect: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        },
        { type: "separator" },
        { label: "Lista", icon: <List className="size-3.5" />, onSelect: () => editor.chain().focus().toggleBulletList().run() },
        {
          label: "Lista numerada",
          icon: <ListOrdered className="size-3.5" />,
          onSelect: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          label: "Lista de tareas",
          icon: <ListChecks className="size-3.5" />,
          onSelect: () => editor.chain().focus().toggleTaskList().run(),
        },
        { label: "Cita", icon: <Quote className="size-3.5" />, onSelect: () => editor.chain().focus().toggleBlockquote().run() },
      ],
    },
    {
      type: "submenu",
      label: "Insertar",
      icon: <TableIcon className="size-3.5" />,
      items: [
        { label: "Tabla", icon: <TableIcon className="size-3.5" />, onSelect: () => runInsertAction(editor, "table") },
        { label: "Nota al pie", icon: <Superscript className="size-3.5" />, onSelect: () => runInsertAction(editor, "footnote") },
        { label: "Bloque de código", icon: <Code2 className="size-3.5" />, onSelect: () => runInsertAction(editor, "codeBlock") },
        { label: "Regla horizontal", icon: <Minus className="size-3.5" />, onSelect: () => runInsertAction(editor, "horizontalRule") },
        { label: "Destacado", icon: <Megaphone className="size-3.5" />, onSelect: () => runInsertAction(editor, "callout") },
      ],
    },
    { type: "separator" },
    { label: "Copiar", icon: <Copy className="size-3.5" />, onSelect: () => copySelection(editor) },
    { label: "Cortar", icon: <Scissors className="size-3.5" />, onSelect: () => cutSelection(editor) },
    { label: "Pegar", icon: <ClipboardPaste className="size-3.5" />, onSelect: () => pasteFromClipboard(editor) },
    { label: "Pegar sin formato", icon: <ClipboardType className="size-3.5" />, onSelect: () => pasteAsPlainText(editor) },
  ];

  return (
    <AppContextMenu trigger={children} items={entries} />
  );
}
