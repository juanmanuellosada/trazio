"use client";

import { AppDialog } from "@/components/primitives/dialog";
import { TaskQuickAddRow } from "@/components/tasks/task-quick-add-row";

/**
 * Diálogo de alta rápida que abre el atajo `Q` (bloque 7.4, requirement "Q
 * abre el alta rápida de tarea"): mismo `TaskQuickAddRow` en `variant="full"`
 * que ya usa `components/layout/sidebar-add-task.tsx` para el acceso del
 * panel lateral — ese componente no es propio de este bloque (pertenece a
 * `components/layout/`, fuera de los archivos de esta tanda), así que acá se
 * monta una segunda instancia del mismo diálogo en vez de tocarlo. Precarga
 * la Bandeja de entrada como destino, igual que ese acceso.
 */
export function GlobalQuickAddDialog({
  open,
  onOpenChange,
  inboxProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` solo si la Bandeja todavía no se resolvió (D27: no debería pasar en uso normal). Sin ella, el atajo simplemente no tiene nada que abrir. */
  inboxProjectId: string | null;
}) {
  if (!inboxProjectId) return null;

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} title="Nueva tarea" size="lg">
      <TaskQuickAddRow
        projectId={inboxProjectId}
        sectionId={null}
        parentId={null}
        defaultExpanded
        variant="full"
        onCancel={() => onOpenChange(false)}
      />
    </AppDialog>
  );
}
