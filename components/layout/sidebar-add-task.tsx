"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AppDialog } from "@/components/primitives/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TaskQuickAddRow } from "@/components/tasks/task-quick-add-row";
import { cn } from "@/lib/utils";

/**
 * Acceso directo para agregar una tarea desde el panel lateral (bloque
 * 10.2): antes solo se podía crear una tarea desde dentro de una vista, y
 * es lo primero que busca alguien que quiere anotar algo rápido. Abre
 * `TaskQuickAddRow` (bloque 5, el mismo componente de alta que ya usan
 * Bandeja, Hoy, Proyecto y las secciones) dentro de un diálogo — sin una
 * segunda implementación acá. Se precarga con la Bandeja de entrada como
 * destino, igual que el resto de los accesos rápidos de alta.
 *
 * Se le pasa `defaultExpanded` para que el formulario aparezca ya
 * desplegado, con el foco en el título: abrir este diálogo ya es la acción
 * de "quiero agregar una tarea", así que no tiene sentido pedir un segundo
 * clic sobre el botón "Agregar tarea" que `TaskQuickAddRow` muestra por
 * defecto en el resto de las superficies.
 */
export function SidebarAddTask({
  collapsed,
  inboxProjectId,
}: {
  collapsed: boolean;
  /** `null` solo si la Bandeja de entrada todavía no se resolvió entre `initialProjects`; no debería pasar en uso normal (D27: todo usuario tiene una). */
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
      {inboxProjectId && (
        <AppDialog open={open} onOpenChange={setOpen} title="Nueva tarea">
          <TaskQuickAddRow projectId={inboxProjectId} sectionId={null} parentId={null} defaultExpanded />
        </AppDialog>
      )}
    </>
  );
}
