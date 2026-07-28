"use client";

import type { Editor } from "@tiptap/react";
import {
  Bold,
  Check,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Strikethrough,
  Type,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { InsertMenu } from "./insert-menu";

const HEADING_OPTIONS = [
  { level: 1 as const, label: "Título 1", icon: Heading1 },
  { level: 2 as const, label: "Título 2", icon: Heading2 },
  { level: 3 as const, label: "Título 3", icon: Heading3 },
];

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

function HeadingMenu({ editor }: { editor: Editor }) {
  const activeLevel = HEADING_OPTIONS.find((option) => editor.isActive("heading", { level: option.level }))?.level;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Título"
            aria-pressed={activeLevel != null}
            className={activeLevel != null ? "bg-surface text-foreground" : undefined}
          />
        }
      >
        <Type className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
          Párrafo
          {activeLevel == null && <Check className="ml-auto size-3.5" aria-hidden />}
        </DropdownMenuItem>
        {HEADING_OPTIONS.map(({ level, label, icon: Icon }) => (
          <DropdownMenuItem key={level} onClick={() => editor.chain().focus().toggleHeading({ level }).run()}>
            <Icon className="size-3.5" />
            {label}
            {activeLevel === level && <Check className="ml-auto size-3.5" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Barra de herramientas del editor de descripción (bloque 7.4): títulos,
 * negrita, cursiva, tachado, resaltado, código en línea, listas con
 * viñetas, numeradas y de tareas, cita, más el botón de enlace (bloque 7.8)
 * y el de insertar (bloque 7.7). Ninguna opción de fórmula matemática —
 * excluida por decisión D30.
 */
export function DescriptionEditorToolbar({
  editor,
  onOpenLinkDialog,
}: {
  editor: Editor;
  onOpenLinkDialog: () => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-0.5 border-b border-border pb-1.5"
      role="toolbar"
      aria-label="Formato de la descripción"
    >
      <HeadingMenu editor={editor} />
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <ToolbarButton label="Negrita" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Itálica" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Tachado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Resaltado" active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <Highlighter className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Código" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Enlace" active={editor.isActive("link")} onClick={onOpenLinkDialog}>
        <LinkIcon className="size-3.5" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-0.5 h-5" />
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
      <ToolbarButton
        label="Lista de tareas"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListChecks className="size-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Cita" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-3.5" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-0.5 h-5" />
      <InsertMenu editor={editor} />
    </div>
  );
}
