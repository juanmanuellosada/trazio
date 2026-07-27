"use client";

import { useDeleteProject } from "@/lib/projects/mutations";
import { useProjectSubtreeTaskCount } from "@/lib/projects/use-subtree-task-count";
import type { ProjectRow } from "@/lib/projects/use-projects";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

/**
 * Confirmación de borrado de proyecto (bloque 6.5, criterio literal del
 * roadmap; migrada a la confirmación propia en el bloque 2.7): muestra el
 * conteo real de tareas del proyecto y de todo su subárbol de subproyectos
 * (`useProjectSubtreeTaskCount`), no un número inventado. No hay deshacer:
 * el spec de `proyectos-secciones` lo prohíbe de forma explícita para esta
 * acción en particular.
 */
export function DeleteProjectDialog({
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
  /** Si se está borrando desde la propia página del proyecto, hay que navegar afuera al confirmar. */
  onDeleted?: () => void;
}) {
  const { data: taskCount, isLoading } = useProjectSubtreeTaskCount(project.id, allProjects, open);
  const deleteProject = useDeleteProject();

  function handleConfirm() {
    deleteProject.mutate(project.id, { onSuccess: () => onDeleted?.() });
    onOpenChange(false);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar “${project.name}”`}
      description={
        isLoading
          ? "Contando las tareas que se van a perder…"
          : taskCount && taskCount > 0
            ? `Se van a eliminar ${taskCount} ${taskCount === 1 ? "tarea" : "tareas"} de este proyecto y de sus subproyectos, junto con todas sus secciones. Esta acción no se puede deshacer.`
            : "Este proyecto no tiene tareas. Se va a eliminar junto con sus secciones. Esta acción no se puede deshacer."
      }
      confirmLabel="Eliminar de forma permanente"
      destructive
      confirmDisabled={isLoading}
      onConfirm={handleConfirm}
    />
  );
}
