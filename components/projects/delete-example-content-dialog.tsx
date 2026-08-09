"use client";

import { useDeleteExampleContent } from "@/lib/onboarding/mutations";
import { useProjectSubtreeTaskCount } from "@/lib/projects/use-subtree-task-count";
import type { ProjectRow } from "@/lib/projects/use-projects";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

/**
 * Confirmación de "Borrar los ejemplos" (`openspec/changes/onboarding-con-ejemplos`,
 * D-D): mismo camino de confirmación que `DeleteProjectDialog` —conteo real
 * de tareas, irreversible—, pero se lleva también el hábito y el filtro de
 * ejemplo en el mismo viaje (`useDeleteExampleContent`). Solo se usa para el
 * proyecto con `is_example: true`; `ProjectHeader` decide cuál de los dos
 * diálogos mostrar.
 */
export function DeleteExampleContentDialog({
  open,
  onOpenChange,
  project,
  allProjects,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectRow;
  allProjects: ProjectRow[];
  onDeleted?: () => void;
}) {
  const { data: taskCount, isLoading } = useProjectSubtreeTaskCount(project.id, allProjects, open);
  const deleteExampleContent = useDeleteExampleContent();

  function handleConfirm() {
    deleteExampleContent.mutate(project.id, { onSuccess: () => onDeleted?.() });
    onOpenChange(false);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Borrar los ejemplos"
      description={
        isLoading
          ? "Contando las tareas que se van a perder…"
          : `Se van a eliminar el proyecto “${project.name}”${
              taskCount && taskCount > 0 ? ` con ${taskCount} ${taskCount === 1 ? "tarea" : "tareas"}` : ""
            }, el hábito de ejemplo y el filtro de ejemplo. Esta acción no se puede deshacer.`
      }
      confirmLabel="Eliminar de forma permanente"
      destructive
      confirmDisabled={isLoading}
      onConfirm={handleConfirm}
    />
  );
}
