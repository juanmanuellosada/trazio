"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Code, Italic, Link as LinkIcon, List, ListOrdered, Quote } from "lucide-react";
import type { Json } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

function ToolbarButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-text-secondary outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        active && "bg-surface text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Descripción de una tarea (bloque 7.3): Tiptap, guardada como jsonb, con
 * texto enriquecido (negrita, itálica, listas, links, código, citas — la
 * tabla de entidades de `docs/product-spec.md` §2). El autoguardado en sí
 * (debounce, no pisar lo que se está escribiendo) lo maneja
 * `task-detail-content.tsx`, que le pasa `onChange`; este componente solo
 * traduce el editor a jsonb.
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
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: (content as object | null) ?? EMPTY_DOC,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "min-h-24 text-base leading-relaxed outline-none [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-text-secondary [&_code]:rounded [&_code]:bg-surface [&_code]:px-1 [&_a]:text-primary [&_a]:underline",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as Json),
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  function toggleLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("URL del link:");
    if (!url) return;
    editor.chain().focus().setLink({ href: url }).run();
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border pb-1.5" role="toolbar" aria-label="Formato de la descripción">
        <ToolbarButton label="Negrita" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Itálica" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Lista numerada"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Cita" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Código" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={toggleLink}>
          <LinkIcon className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
