"use client";

import { useState } from "react";
import { useMoveProject } from "@/lib/projects/mutations";
import { MAX_PROJECT_DEPTH, nextSiblingPosition, projectDepth, wouldCreateCycle } from "@/lib/projects/tree";
import type { ProjectRow } from "@/lib/projects/use-projects";
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
 * Camino sin arrastre para anidar un proyecto (bloque 6.6, requirement
 * "Toda superficie arrastrable tiene un camino alternativo"): elegir el
 * nuevo padre de una lista, o "Nivel superior" para sacarlo de cualquier
 * anidamiento. Los destinos inválidos —el proyecto mismo, sus propios
 * descendientes, y cualquiera ya en el tercer nivel— ni siquiera aparecen en
 * la lista, aunque la base los rechazaría igual si se forzaran.
 */
export function MoveProjectDialog({
  open,
  onOpenChange,
  project,
  allProjects,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectRow;
  allProjects: ProjectRow[];
}) {
  const moveProject = useMoveProject();
  const [selected, setSelected] = useState<string | null>(project.parent_id);

  const candidates = allProjects.filter((p) => {
    if (p.is_inbox || p.is_archived || p.id === project.id) return false;
    if (wouldCreateCycle(allProjects, project.id, p.id)) return false;
    if (projectDepth(allProjects, p.id) >= MAX_PROJECT_DEPTH) return false;
    return true;
  });

  function handleConfirm() {
    const position = nextSiblingPosition(allProjects, selected);
    moveProject.mutate({ id: project.id, parentId: selected, position });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mover “{project.name}”</DialogTitle>
          <DialogDescription>
            Elegí el proyecto dentro del que va a quedar anidado, o dejalo en el nivel superior.
          </DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Destino" className="max-h-64 space-y-0.5 overflow-y-auto">
          <button
            type="button"
            role="radio"
            aria-checked={selected === null}
            onClick={() => setSelected(null)}
            className={cn(
              "flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
              selected === null && "bg-surface font-medium text-foreground",
            )}
          >
            Nivel superior
          </button>
          {candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="radio"
              aria-checked={selected === candidate.id}
              onClick={() => setSelected(candidate.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                selected === candidate.id && "bg-surface font-medium text-foreground",
              )}
            >
              {candidate.icon ? (
                <span aria-hidden>{candidate.icon}</span>
              ) : (
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: PROJECT_COLORS[candidate.color].light }}
                />
              )}
              <span className="truncate">{candidate.name}</span>
            </button>
          ))}
          {candidates.length === 0 && (
            <p className="px-2.5 py-2 text-sm text-text-secondary">
              No hay otro proyecto disponible como destino.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={selected === project.parent_id}>
            Mover acá
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
