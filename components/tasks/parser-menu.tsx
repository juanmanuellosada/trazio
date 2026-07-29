"use client";

import { FolderOpen, Plus, Tag } from "lucide-react";
import type { ParserMenuOption } from "@/lib/parser/menu-options";
import { cn } from "@/lib/utils";

/**
 * El menú de `#`/`@` del alta rápida (bloque 3, A3 del design): funcionalidad
 * nueva que convive con el reconocimiento en vivo que ya hace el parser, no
 * lo reemplaza. Por eso es una capa puramente visual, sin ninguna primitiva
 * de foco/modalidad de por medio (nada de `Popover`/`Command`, que son
 * capas modales pensadas para robar el foco a propósito, ver `overlay.ts`):
 * un `<div>` posicionado en `absolute` sobre el mismo contenedor relativo
 * del `<input>`, que nunca se enfoca a sí mismo. La navegación por teclado
 * (flechas, Enter, Tab, Escape) la maneja `task-quick-add-row.tsx` en el
 * `onKeyDown` del propio `<input>` — acá solo se pinta el estado que ese
 * componente ya calculó (`selectedIndex`). El clic en una opción usa
 * `onMouseDown` con `preventDefault` para no moverle el foco al `<input>`
 * ni por un instante.
 */
export function ParserMenu({
  symbol,
  options,
  selectedIndex,
  onPick,
}: {
  symbol: "#" | "@";
  options: ParserMenuOption[];
  selectedIndex: number;
  onPick: (option: ParserMenuOption) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label={symbol === "#" ? "Proyectos y secciones" : "Etiquetas"}
      className="absolute top-full left-0 z-20 mt-1 max-h-56 w-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      {options.length === 0 ? (
        <div className="px-2.5 py-1.5 text-text-secondary">
          {symbol === "#" ? "No encontramos ningún proyecto." : "No encontramos ninguna etiqueta."}
        </div>
      ) : (
        options.map((option, index) => (
          <div
            key={option.id}
            role="option"
            aria-selected={index === selectedIndex}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(option)}
            className={cn(
              "flex cursor-default items-center gap-1.5 rounded-md px-2.5 py-1.5 select-none",
              option.isSection && "ml-3.5",
              index === selectedIndex && "bg-muted text-foreground",
            )}
          >
            {option.isCreate ? (
              <Plus className="size-3.5 shrink-0 text-text-secondary" aria-hidden />
            ) : symbol === "#" ? (
              <FolderOpen className="size-3.5 shrink-0 text-text-secondary" aria-hidden />
            ) : (
              <Tag className="size-3.5 shrink-0 text-text-secondary" aria-hidden />
            )}
            <span className="truncate">{option.label}</span>
          </div>
        ))
      )}
    </div>
  );
}
