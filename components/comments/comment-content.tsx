"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import type { Json } from "@/lib/supabase/database.types";
import { descriptionEditorExtensions } from "@/components/tasks/description-editor/extensions";
import { cn } from "@/lib/utils";

const CONTENT_CLASS = cn(
  "text-sm leading-relaxed text-foreground outline-none",
  "[&_p]:my-1",
  "[&_h1]:mt-2 [&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-semibold",
  "[&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:text-[0.95rem] [&_h2]:font-semibold",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-text-secondary",
  "[&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_code]:text-[0.85em]",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-surface [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a]:text-primary [&_a]:underline",
  "[&_hr]:my-3 [&_hr]:border-border",
  "[&_mark]:rounded [&_mark]:bg-[color-mix(in_oklch,var(--priority-high),transparent_75%)] [&_mark]:px-0.5",
  "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
  "[&_th]:border [&_th]:border-border [&_th]:bg-surface [&_th]:p-1.5 [&_th]:text-left [&_th]:font-medium",
  "[&_td]:border [&_td]:border-border [&_td]:p-1.5",
  "[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:pl-0",
  "[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:items-start [&_ul[data-type=taskList]_li]:gap-1.5",
  "[&_ul[data-type=taskList]_li>label]:mt-0.5",
  "[&_ul[data-type=taskList]_li[data-checked=true]>div>p]:text-text-secondary [&_ul[data-type=taskList]_li[data-checked=true]>div>p]:line-through",
);

/**
 * Contenido de un comentario en modo lectura (bloque 4.3): mismas
 * extensiones que el editor de descripción (`descriptionEditorExtensions`,
 * ya configurado sin fórmula ni adjuntos), pero `editable: false` y sin
 * barra de herramientas — acá solo se muestra lo escrito.
 */
export function CommentContent({ content }: { content: Json }) {
  const editor = useEditor({
    extensions: descriptionEditorExtensions(),
    content: content as object,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: CONTENT_CLASS } },
  });

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
