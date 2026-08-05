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
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

export type AppContextMenuEntry =
  | { type: "separator" }
  | {
      type: "submenu";
      label: string;
      icon?: ReactNode;
      items: AppContextMenuEntry[];
      /**
       * Apertura controlada del submenú desde afuera (`menu-contextual-de-tarea`,
       * D-C): `T`/`Y` abren la fila de fecha/prioridad del menú de una tarea sin
       * pasar por el hover o la flecha derecha. Sin especificar, el submenú
       * maneja su propio estado como siempre.
       */
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
    }
  | {
      type?: "item";
      label: string;
      onSelect: () => void;
      icon?: ReactNode;
      destructive?: boolean;
      disabled?: boolean;
      /** Contenido alineado al final de la fila (`menu-contextual-de-tarea`): el indicador de atajo de teclado o una marca de "valor actual" (ej. la prioridad vigente). */
      trailing?: ReactNode;
    };

function renderEntries(items: AppContextMenuEntry[]) {
  return items.map((item, index) => {
    if (item.type === "separator") return <ContextMenuSeparator key={index} />;
    if (item.type === "submenu") {
      return (
        <ContextMenuSub key={index} open={item.open} onOpenChange={item.onOpenChange}>
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
        {item.trailing}
      </ContextMenuItem>
    );
  });
}

/**
 * Mismas `items` que `AppContextMenu`, para el botón "…" que algunas filas
 * ofrecen además del clic derecho (D-A de `menu-contextual-de-tarea`):
 * antes `task-row.tsx` y `event-row.tsx` tenían cada una su propia copia
 * casi idéntica de esta función — unificada acá (grupo 7 de
 * `calendario-legible-y-manipulable`) para no sumar una tercera al cablear
 * el menú de un bloque de calendario, que solo necesita la versión de clic
 * derecho (`renderEntries` de abajo), sin botón "…" propio.
 */
export function renderDropdownEntries(items: AppContextMenuEntry[]): ReactNode[] {
  return items.map((item, index) => {
    if (item.type === "separator") return <DropdownMenuSeparator key={index} />;
    if (item.type === "submenu") {
      return (
        <DropdownMenuSub key={index} open={item.open} onOpenChange={item.onOpenChange}>
          <DropdownMenuSubTrigger>
            {item.icon}
            {item.label}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>{renderDropdownEntries(item.items)}</DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }
    return (
      <DropdownMenuItem key={index} variant={item.destructive ? "destructive" : "default"} disabled={item.disabled} onClick={item.onSelect}>
        {item.icon}
        {item.label}
        {item.trailing}
      </DropdownMenuItem>
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
 * reimplementado acá).
 *
 * Segundo consumidor: el menú de acciones de una tarea
 * (`menu-contextual-de-tarea`, `components/tasks/task-row.tsx`), que además
 * lo abre desde el botón de tres puntitos — mismas `items`, sin una segunda
 * lista que mantener por separado (D-A). `onOpenChange` es lo único que ese
 * consumidor necesita del root: saber cuándo el menú está abierto para
 * habilitar sus atajos de teclado propios.
 */
export function AppContextMenu({
  trigger,
  items,
  onOpenChange,
}: {
  trigger: ReactNode;
  items: AppContextMenuEntry[];
  /** Consumida por `menu-contextual-de-tarea`: saber si el menú está abierto, sin importar por qué entrada. */
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger>{trigger}</ContextMenuTrigger>
      <ContextMenuContent>{renderEntries(items)}</ContextMenuContent>
    </ContextMenu>
  );
}
