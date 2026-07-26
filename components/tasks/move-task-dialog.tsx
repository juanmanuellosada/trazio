"use client";

import { useState } from "react";
import { useProjects } from "@/lib/projects/use-projects";
import { useSections } from "@/lib/sections/use-sections";
import { useMoveTask } from "@/lib/tasks/mutations";
import { nextSiblingPositionInContext } from "@/lib/tasks/tree";
import { useTasks } from "@/lib/tasks/use-tasks";
import { PROJECT_COLORS } from "@/lib/validation/colors";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Mover una tarea de proyecto o de sección (bloque 7.7), camino sin
 * arrastre: elegir el proyecto destino y, si tiene secciones, la sección
 * dentro de ese proyecto (o "Sin sección"). La tarea se ubica al final del
 * contexto elegido. Solo mueve tareas de primer nivel: una subtarea se
 * reubica por indentar/desindentar, no por acá.
 */
export function MoveTaskDialog({
  open,
  onOpenChange,
  taskId,
  fromProjectId,
  currentSectionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  fromProjectId: string;
  currentSectionId: string | null;
}) {
  const { data: projects } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState(fromProjectId);
  const { data: sections } = useSections(selectedProjectId);
  const { data: destinationTasks } = useTasks(selectedProjectId);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(currentSectionId);
  const moveTask = useMoveTask();

  const candidateProjects = (projects ?? []).filter((p) => !p.is_archived);
  const orderedSections = [...(sections ?? [])].sort((a, b) => a.position - b.position);

  function handleConfirm() {
    const position = nextSiblingPositionInContext(destinationTasks ?? [], {
      projectId: selectedProjectId,
      sectionId: selectedSectionId,
      parentId: null,
    });
    moveTask.mutate({
      id: taskId,
      fromProjectId,
      toProjectId: selectedProjectId,
      sectionId: selectedSectionId,
      parentId: null,
      position,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mover tarea</DialogTitle>
          <DialogDescription>Elegí el proyecto y, si tiene, la sección de destino.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div role="radiogroup" aria-label="Proyecto destino" className="max-h-40 space-y-0.5 overflow-y-auto">
            {candidateProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                role="radio"
                aria-checked={selectedProjectId === project.id}
                onClick={() => {
                  setSelectedProjectId(project.id);
                  setSelectedSectionId(null);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                  selectedProjectId === project.id && "bg-surface font-medium text-foreground",
                )}
              >
                {project.icon ? (
                  <span aria-hidden>{project.icon}</span>
                ) : (
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: PROJECT_COLORS[project.color].light }}
                  />
                )}
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>

          {orderedSections.length > 0 && (
            <div role="radiogroup" aria-label="Sección destino" className="max-h-32 space-y-0.5 overflow-y-auto border-t border-border pt-2">
              <button
                type="button"
                role="radio"
                aria-checked={selectedSectionId === null}
                onClick={() => setSelectedSectionId(null)}
                className={cn(
                  "flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                  selectedSectionId === null && "bg-surface font-medium text-foreground",
                )}
              >
                Sin sección
              </button>
              {orderedSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  role="radio"
                  aria-checked={selectedSectionId === section.id}
                  onClick={() => setSelectedSectionId(section.id)}
                  className={cn(
                    "flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                    selectedSectionId === section.id && "bg-surface font-medium text-foreground",
                  )}
                >
                  {section.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleConfirm}
            disabled={selectedProjectId === fromProjectId && selectedSectionId === currentSectionId}
          >
            Mover acá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
