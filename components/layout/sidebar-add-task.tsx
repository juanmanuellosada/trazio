"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GlobalQuickAddDialog } from "@/components/shortcuts/global-quick-add-dialog";
import { ShortcutHint } from "@/components/shortcuts/shortcut-hint";
import { GENERAL_SHORTCUTS } from "@/lib/shortcuts/general";
import { cn } from "@/lib/utils";

/**
 * Acceso directo para agregar una tarea desde el panel lateral (bloque
 * 10.2, ahora el modal global de `alta-de-tareas-en-contexto`): antes solo
 * se podía crear una tarea desde dentro de una vista, y es lo primero que
 * busca alguien que quiere anotar algo rápido. Monta `GlobalQuickAddDialog`
 * —el mismo diálogo que abre el atajo `Q`, hasta hace poco copiado a mano
 * acá y en `shortcut-provider.tsx`— en vez de una segunda implementación:
 * los dos disparadores comparten un único componente que hereda el
 * contexto de la vista actual y resuelve su propio destino (D-A/D-B).
 */
export function SidebarAddTask({
  collapsed,
  inboxProjectId,
}: {
  collapsed: boolean;
  /** Último eslabón de la cadena de destino (D-B), no un destino fijo: solo se usa sin contexto de vista ni proyecto por defecto. `null` solo si la Bandeja de entrada todavía no se resolvió entre `initialProjects`; no debería pasar en uso normal (D27: todo usuario tiene una). */
  inboxProjectId: string | null;
}) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      disabled={!inboxProjectId}
      className={cn(
        "flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-text-secondary outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        collapsed && "w-9 justify-center px-0",
      )}
    >
      <Plus className="size-4 shrink-0" />
      {!collapsed && <span className="flex-1 text-left">Agregar tarea</span>}
      {!collapsed && <ShortcutHint combo={GENERAL_SHORTCUTS.agregarTarea} />}
    </button>
  );

  return (
    <>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger render={trigger} />
          <TooltipContent side="right">Agregar tarea</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <GlobalQuickAddDialog open={open} onOpenChange={setOpen} inboxProjectId={inboxProjectId} />
    </>
  );
}
