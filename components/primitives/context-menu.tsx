"use client";

import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export type AppContextMenuEntry =
  | { type: "separator" }
  | {
      type: "submenu";
      label: string;
      icon?: ReactNode;
      items: AppContextMenuEntry[];
    }
  | {
      type?: "item";
      label: string;
      onSelect: () => void;
      icon?: ReactNode;
      destructive?: boolean;
      disabled?: boolean;
    };

function renderEntries(items: AppContextMenuEntry[]) {
  return items.map((item, index) => {
    if (item.type === "separator") return <ContextMenuSeparator key={index} />;
    if (item.type === "submenu") {
      return (
        <ContextMenuSub key={index}>
          <ContextMenuSubTrigger>
            {item.icon}
            {item.label}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>{renderEntries(item.items)}</ContextMenuSubContent>
        </ContextMenuSub>
      );
    }
    return (
      <ContextMenuItem
        key={index}
        variant={item.destructive ? "destructive" : "default"}
        disabled={item.disabled}
        onClick={item.onSelect}
      >
        {item.icon}
        {item.label}
      </ContextMenuItem>
    );
  });
}

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
 * Primer consumidor: el menú del editor de descripción (bloque 7), que
 * necesita submenús (formato, párrafo, insertar) — de ahí la variante
 * `type: "submenu"` de `AppContextMenuEntry`, agregada en este bloque sobre
 * `ContextMenuSub`/`ContextMenuSubTrigger`/`ContextMenuSubContent` de
 * `ui/context-menu.tsx` (mismo manejo de teclado y foco que el resto, nada
 * reimplementado acá). Cualquier superficie futura con acciones por clic
 * derecho puede sumarse como segundo consumidor.
 */
export function AppContextMenu({ trigger, items }: { trigger: ReactNode; items: AppContextMenuEntry[] }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{trigger}</ContextMenuTrigger>
      <ContextMenuContent>{renderEntries(items)}</ContextMenuContent>
    </ContextMenu>
  );
}
