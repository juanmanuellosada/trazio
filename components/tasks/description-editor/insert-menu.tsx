"use client";

import type { Editor } from "@tiptap/react";
import { Code2, Megaphone, Minus, Plus, Superscript, Table as TableIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { runInsertAction } from "./insert-actions";

const INSERT_OPTIONS = [
  { action: "table", label: "Tabla", icon: TableIcon },
  { action: "footnote", label: "Nota al pie", icon: Superscript },
  { action: "codeBlock", label: "Bloque de código", icon: Code2 },
  { action: "horizontalRule", label: "Regla horizontal", icon: Minus },
  { action: "callout", label: "Destacado", icon: Megaphone },
] as const;

/**
 * Botón "Insertar" de la barra de herramientas (bloque 7.7): tabla, nota al
 * pie, bloque de código, regla horizontal y destacado. Mismas cinco
 * acciones que el submenú "Insertar" del menú contextual
 * (`editor-context-menu.tsx`) — los dos consumen `runInsertAction` de
 * `insert-actions.ts` en vez de repetir los comandos acá.
 */
export function InsertMenu({ editor }: { editor: Editor }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label="Insertar" />}
      >
        <Plus className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {INSERT_OPTIONS.map(({ action, label, icon: Icon }) => (
          <DropdownMenuItem key={action} onClick={() => runInsertAction(editor, action)}>
            <Icon className="size-3.5" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
