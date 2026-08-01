"use client";

import { useId, useState, type FormEvent } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects } from "@/lib/projects/use-projects";
import { useCreateTask, useUpdateTask } from "@/lib/tasks/mutations";
import { durationMinutesBetween, type DragResult } from "@/lib/calendar/drag";

/**
 * Alta de tarea desde un arrastre sobre espacio vacío del calendario (tarea
 * 6.7/D-F: "esta vista nunca decide qué mutación corresponde"): el camino
 * que sigue a elegir "Tarea" en `CreateBlockChoiceDialog`, sin el cual esa
 * opción no creaba nada — mismo formulario mínimo que `CreateEventDialog`
 * (solo título y destino). `useCreateTask` no acepta horario propio (solo
 * `dueDate`), así que el horario del rango arrastrado se aplica en un
 * segundo paso con `useUpdateTask`, reusando las dos mutaciones que ya
 * existen en vez de sumar una tercera.
 */
export function CreateTaskFromRangeDialog({
  open,
  onOpenChange,
  range,
  fixedProjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  range: DragResult;
  /** Proyecto fijo del contexto (Bandeja/Proyecto): sin selector. `null` en Próximos, que no tiene un proyecto propio. */
  fixedProjectId: string | null;
}) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const { data: projects } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const availableProjects = (projects ?? []).filter((p) => !p.is_archived);
  const effectiveProjectId = fixedProjectId ?? projectId ?? availableProjects[0]?.id ?? null;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTitle("");
      setProjectId(null);
    }
    onOpenChange(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !effectiveProjectId) return;
    const durationMinutes = durationMinutesBetween(range.start.toISOString(), range.end.toISOString());

    createTask.mutate(
      { projectId: effectiveProjectId, sectionId: null, parentId: null, title: title.trim() },
      {
        onSuccess: (created) => {
          updateTask.mutate({
            id: created.id,
            projectId: effectiveProjectId,
            patch: { due_at: range.start.toISOString(), duration_minutes: durationMinutes },
          });
          handleOpenChange(false);
        },
      },
    );
  }

  const rangeLabel = `${format(range.start, "EEEE d 'de' MMMM, HH:mm", { locale: es })}–${format(range.end, "HH:mm", { locale: es })}`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tarea nueva</DialogTitle>
          <DialogDescription>{rangeLabel}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={titleId}>Título</Label>
            <Input
              id={titleId}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoFocus
              placeholder="Ej: Escribir el informe"
            />
          </div>

          {!fixedProjectId && (
            <div className="space-y-1.5">
              <Label>Proyecto</Label>
              <Select value={effectiveProjectId ?? undefined} onValueChange={(next) => next && setProjectId(next)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || !effectiveProjectId || createTask.isPending}>
              Crear tarea
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
