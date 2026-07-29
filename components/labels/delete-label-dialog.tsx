"use client";

import { useDeleteLabel } from "@/lib/labels/mutations";
import { useLabelTaskCount } from "@/lib/labels/use-label-task-count";
import type { LabelChip } from "@/lib/tasks/use-tasks";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

/**
 * Confirmación de borrado de etiqueta (bloque 4.2, requirement "La
 * eliminación de una etiqueta desde la administración exige confirmación"):
 * mismo patrón que `DeleteProjectDialog`, pero con una redacción distinta a
 * propósito — a diferencia de borrar un proyecto, borrar una etiqueta NUNCA
 * borra tareas, solo la desasigna de todas las que la tenían (`on delete
 * cascade` en `task_labels.label_id`, ya existe en la base). El mensaje lo
 * dice así de explícito para no sugerir que se pierden tareas.
 */
export function DeleteLabelDialog({
  open,
  onOpenChange,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: LabelChip;
}) {
  const { data: taskCount, isLoading } = useLabelTaskCount(label.id, open);
  const deleteLabel = useDeleteLabel();

  function handleConfirm() {
    deleteLabel.mutate(label.id);
    onOpenChange(false);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar “${label.name}”`}
      description={
        isLoading
          ? "Contando las tareas que tienen esta etiqueta…"
          : taskCount && taskCount > 0
            ? `Esta etiqueta está asignada a ${taskCount} ${taskCount === 1 ? "tarea" : "tareas"}. Se va a quitar de ${taskCount === 1 ? "esa tarea" : "todas ellas"}. Esta acción no se puede deshacer.`
            : "Esta etiqueta no está asignada a ninguna tarea. Se va a eliminar. Esta acción no se puede deshacer."
      }
      confirmLabel="Eliminar de forma permanente"
      destructive
      confirmDisabled={isLoading}
      onConfirm={handleConfirm}
    />
  );
}
