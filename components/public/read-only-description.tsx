"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { Json } from "@/lib/supabase/database.types";
import { descriptionEditorExtensions } from "@/components/tasks/description-editor/extensions";
import { EDITOR_CONTENT_TYPOGRAPHY_CLASS } from "@/components/tasks/task-description-editor";
import { cn } from "@/lib/utils";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * Descripción de una tarea en la vista pública de un enlace de lectura
 * (`enlace-de-lectura-de-un-proyecto`, D-G): mismo motor Tiptap que
 * `TaskDescriptionEditor` —nunca `dangerouslySetInnerHTML`, el JSONB se
 * renderiza a través del propio editor— pero sin su barra de herramientas
 * ni su menú contextual. A diferencia de `disabled` ahí (pensado para
 * "temporalmente no editable"), acá no hay nada de eso que mostrar
 * deshabilitado: la tarea 3.5 pide que la vista pública no ofrezca "ningún
 * control de escritura, ni siquiera deshabilitado", así que este
 * componente no los importa en absoluto.
 *
 * El link del starter kit está desactivado a favor de uno propio
 * (`description-editor/extensions.ts`) configurado con
 * `openOnClick: false` y `rel="noopener noreferrer nofollow"` +
 * `target="_blank"` por defecto de `@tiptap/extension-link` — es lo que
 * cubre, para los enlaces que pueda tener una descripción, la mitad de D-C
 * que no resuelve `Referrer-Policy` (esa vive en `next.config.ts`, la otra
 * mitad, a nivel de toda la ruta).
 */
export function ReadOnlyDescription({ content, className }: { content: Json | null; className?: string }) {
  const editor = useEditor({
    extensions: descriptionEditorExtensions(),
    content: (content as object | null) ?? EMPTY_DOC,
    editable: false,
    immediatelyRender: false,
  });

  if (!editor || editor.isEmpty) return null;

  return (
    <div className={cn("text-sm leading-relaxed text-text-secondary", EDITOR_CONTENT_TYPOGRAPHY_CLASS, className)}>
      <EditorContent editor={editor} />
    </div>
  );
}
