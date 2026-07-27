"use client";

import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export type AppContextMenuEntry =
  | { type: "separator" }
  | {
      type?: "item";
      label: string;
      onSelect: () => void;
      icon?: ReactNode;
      destructive?: boolean;
      disabled?: boolean;
    };

/**
 * Menú contextual propio de Trazio (bloque 2.4): capa de identidad sobre
 * `ContextMenu` de shadcn/ui (instalado en este mismo bloque, no existía
 * antes), que ya resuelve abrir con clic derecho o la tecla de menú del
 * teclado, navegar las opciones con las flechas, activar la resaltada con
 * `Enter`, y cerrar con `Escape` o clic afuera sin ejecutar nada.
 *
 * A diferencia de `Dialog` o `Menu`, `ContextMenu` no expone `modal` como
 * prop configurable — internamente ya se resuelve como capa modal siempre
 * (bloquea el scroll de fondo sin que haga falta pedirlo), así que acá no
 * hay nada que fijar explícitamente con `overlay.ts`.
 *
 * Sin consumidor todavía dentro de este bloque: lo usa el menú del editor
 * de descripción (bloque 7) y cualquier superficie futura con acciones por
 * clic derecho. Va primero porque el orden de `design.md` sección E lo pide
 * — las primitivas se construyen antes de lo que las consume, no al revés.
 */
export function AppContextMenu({ trigger, items }: { trigger: ReactNode; items: AppContextMenuEntry[] }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{trigger}</ContextMenuTrigger>
      <ContextMenuContent>
        {items.map((item, index) =>
          item.type === "separator" ? (
            <ContextMenuSeparator key={index} />
          ) : (
            <ContextMenuItem
              key={index}
              variant={item.destructive ? "destructive" : "default"}
              disabled={item.disabled}
              onClick={item.onSelect}
            >
              {item.icon}
              {item.label}
            </ContextMenuItem>
          ),
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
