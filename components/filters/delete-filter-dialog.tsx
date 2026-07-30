"use client";

import { useDeleteFilter } from "@/lib/filters/mutations";
import type { FilterRow } from "@/lib/filters/use-filters";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

/**
 * Confirmación de borrado de filtro (bloque 2.12, requirement "Eliminar un
 * filtro no toca las tareas que mostraba"): a diferencia de un proyecto, acá
 * no hay nada que contar — eliminar un filtro nunca afecta ninguna tarea,
 * etiqueta ni proyecto que su consulta mostraba.
 */
export function DeleteFilterDialog({
  open,
  onOpenChange,
  filter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: FilterRow;
}) {
  const deleteFilter = useDeleteFilter();

  function handleConfirm() {
    deleteFilter.mutate(filter.id);
    onOpenChange(false);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar “${filter.name}”`}
      description="Las tareas que mostraba este filtro no se ven afectadas: solo se elimina la consulta guardada."
      confirmLabel="Eliminar"
      destructive
      onConfirm={handleConfirm}
    />
  );
}
