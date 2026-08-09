"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Json } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";
import { descriptionEditorExtensions } from "./description-editor/extensions";
import { DescriptionEditorToolbar } from "./description-editor/toolbar";
import { EditorContextMenu } from "./description-editor/editor-context-menu";
import { LinkDialog } from "./description-editor/link-dialog";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * Reglas de tipografía anidada para el HTML que produce
 * `descriptionEditorExtensions()` (títulos, listas, citas, código, tablas,
 * listas de tareas...), separadas de `min-h-32`/`outline-none` (propias del
 * lienzo editable) para que `components/public/read-only-description.tsx`
 * —la vista pública de `enlace-de-lectura-de-un-proyecto`, que renderiza el
 * mismo JSONB pero nunca como un campo editable— pueda reusarlas sin
 * heredar una altura mínima ni un contorno de foco que no le corresponden.
 */
export const EDITOR_CONTENT_TYPOGRAPHY_CLASS = cn(
  "[&_p]:my-1",
  "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:text-xl [&_h1]:font-semibold",
  "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:text-lg [&_h2]:font-semibold",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-text-secondary",
  "[&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:text-[0.85em]",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a]:text-primary [&_a]:underline",
  "[&_hr]:my-4 [&_hr]:border-border",
  "[&_mark]:rounded [&_mark]:bg-[color-mix(in_oklch,var(--priority-high),transparent_75%)] [&_mark]:px-0.5",
  "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_th]:border [&_th]:border-border [&_th]:bg-surface [&_th]:p-1.5 [&_th]:text-left [&_th]:font-medium",
  "[&_td]:border [&_td]:border-border [&_td]:p-1.5",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-1.5",
  "[&_ul[data-type=taskList]_li>label]:mt-0.5",
  "[&_ul[data-type=taskList]_li[data-checked=true]>div>p]:text-text-secondary [&_ul[data-type=taskList]_li[data-checked=true]>div>p]:line-through",
);

const EDITOR_CONTENT_CLASS = cn("min-h-32 text-base leading-relaxed outline-none", EDITOR_CONTENT_TYPOGRAPHY_CLASS);

/**
 * Descripción de una tarea (bloque 7): Tiptap, guardada como jsonb, con
 * texto enriquecido — títulos, negrita, itálica, tachado, resaltado,
 * código, listas (con viñetas, numeradas, de tareas), citas, tablas,
 * notas al pie y destacado (`description-editor/`, decisión D31). Sin
 * fórmula matemática (D30). El autoguardado en sí (debounce, no pisar lo
 * que se está escribiendo) lo maneja `task-detail-content.tsx`, que le pasa
 * `onChange`; este componente solo traduce el editor a jsonb — `content`
 * se usa exclusivamente como valor inicial de `useEditor` (deps `[]`, la
 * librería no reconstruye el editor cuando cambia esta prop), así que una
 * invalidación de query o un evento de Realtime que actualice `content`
 * mientras se edita nunca pisa lo que se está escribiendo.
 */
export function TaskDescriptionEditor({
  content,
  onChange,
  disabled,
}: {
  content: Json | null;
  onChange: (json: Json) => void;
  disabled?: boolean;
}) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const editor = useEditor({
    extensions: descriptionEditorExtensions(),
    content: (content as object | null) ?? EMPTY_DOC,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: EDITOR_CONTENT_CLASS,
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as Json),
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  const linkInitialUrl = editor.isActive("link") ? (editor.getAttributes("link").href as string) : null;

  function handleLinkConfirm(url: string) {
    if (!editor) return;
    if (editor.state.selection.empty) {
      editor
        .chain()
        .focus()
        .insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] })
        .run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function handleLinkRemove() {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
  }

  return (
    <div className="space-y-1.5">
      <DescriptionEditorToolbar editor={editor} onOpenLinkDialog={() => setLinkDialogOpen(true)} />
      <EditorContextMenu editor={editor} onOpenLinkDialog={() => setLinkDialogOpen(true)}>
        <div
          data-testid="task-description-editor"
          className="rounded-lg border border-border bg-background px-3 py-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
        >
          <EditorContent editor={editor} />
        </div>
      </EditorContextMenu>
      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        initialUrl={linkInitialUrl}
        onConfirm={handleLinkConfirm}
        onRemove={linkInitialUrl ? handleLinkRemove : undefined}
      />
    </div>
  );
}
