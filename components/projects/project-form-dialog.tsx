"use client";

import { useEffect, useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { projectFormSchema, type ProjectFormOutput, type ProjectFormValues } from "@/lib/validation/projects";
import { PROJECT_COLOR_IDS, resolveProjectColorHex } from "@/lib/validation/colors";
import { useCreateProject, useUpdateProject } from "@/lib/projects/mutations";
import { MAX_PROJECT_DEPTH, projectDepth } from "@/lib/projects/tree";
import type { ProjectRow } from "@/lib/projects/use-projects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectField, type SelectFieldOption } from "@/components/primitives/select-field";
import { ColorSwatchPicker } from "./color-swatch-picker";
import { EmojiPicker } from "./emoji-picker";

const DEFAULT_VALUES: ProjectFormValues = {
  name: "",
  color: PROJECT_COLOR_IDS[0],
  icon: undefined,
  description: undefined,
  isFavorite: false,
};

const NO_PARENT_VALUE = "sin-padre";

/**
 * Diálogo de crear/editar proyecto (bloque 6.2, con color, ícono, padre y
 * favorito del bloque 8). El mismo formulario cubre los dos casos: sin
 * `project` crea (opcionalmente como subproyecto de `parentId`), con
 * `project` edita ese proyecto. `allProjects` alimenta el selector de
 * proyecto padre, que solo aparece al crear: reanidar un proyecto existente
 * ya tiene su propio camino ("Mover a…", `move-project-dialog.tsx`).
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  parentId = null,
  allProjects = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectRow;
  parentId?: string | null;
  allProjects?: ProjectRow[];
}) {
  const nameId = useId();
  const isEditing = !!project;
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const pending = createProject.isPending || updateProject.isPending;

  const [selectedParentId, setSelectedParentId] = useState<string | null>(parentId);
  // El diálogo queda montado entre aperturas (`open` solo cambia una prop),
  // así que reiniciar `selectedParentId` al reabrir no puede ser el valor
  // inicial de `useState`. Se ajusta durante el render, no en un efecto
  // (patrón "Adjusting state when a prop changes" de react.dev): evita el
  // render de más que un `useEffect` con `setState` produciría acá.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSelectedParentId(project ? project.parent_id : parentId);
  }

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues, unknown, ProjectFormOutput>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      project
        ? {
            name: project.name,
            // `project.color` es `string | null` porque `ProjectRow` cubre
            // también la Bandeja, pero este diálogo nunca se abre para
            // editarla (project-header.tsx / project-tree.tsx la excluyen del
            // menú "Editar"): el `??` es solo para conformar al tipo.
            color: project.color ?? PROJECT_COLOR_IDS[0],
            icon: project.icon ?? undefined,
            description: project.description ?? undefined,
            isFavorite: project.is_favorite,
          }
        : DEFAULT_VALUES,
    );
  }, [open, project, parentId, reset]);

  // Candidatos a padre (bloque 8.8): ni la Bandeja ni archivados, y ninguno
  // que ya esté en el tercer nivel — anidar ahí dejaría al proyecto nuevo en
  // un cuarto, y el tope de tres niveles lo impone la base. Se filtra acá en
  // vez de dejar que falle el trigger de la base.
  const parentCandidates = allProjects.filter((p) => {
    if (p.is_inbox || p.is_archived) return false;
    if (projectDepth(allProjects, p.id) >= MAX_PROJECT_DEPTH) return false;
    return true;
  });

  const parentOptions: SelectFieldOption<string>[] = [
    { value: NO_PARENT_VALUE, label: "Sin padre" },
    ...parentCandidates.map((candidate) => ({
      value: candidate.id,
      label: candidate.name,
      icon: candidate.icon ? (
        <span aria-hidden>{candidate.icon}</span>
      ) : (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: resolveProjectColorHex(candidate.color, "light") }}
        />
      ),
    })),
  ];

  async function onSubmit(values: ProjectFormOutput) {
    if (project) {
      // El favorito y el padre no se tocan acá: el favorito ya tiene su
      // propio camino después de creado (menú de acciones), y el padre se
      // reanida con "Mover a…" — este formulario, al editar, no los expone.
      await updateProject.mutateAsync({
        id: project.id,
        patch: {
          name: values.name,
          color: values.color,
          icon: values.icon,
          description: values.description,
        },
      });
    } else {
      await createProject.mutateAsync({ ...values, parentId: selectedParentId });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar proyecto" : "Nuevo proyecto"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Cambiá el nombre, el color, el ícono o la descripción."
              : "Elegí un nombre, un color y, si querés, un ícono, un proyecto padre y marcarlo como favorito."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={nameId}>Nombre</Label>
            <Input
              id={nameId}
              autoFocus
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${nameId}-error` : undefined}
              className="h-11 text-base"
              {...register("name")}
            />
            {errors.name ? (
              <p id={`${nameId}-error`} role="alert" className="text-sm text-error">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <ColorSwatchPicker value={field.value} onChange={field.onChange} error={errors.color?.message} />
                )}
              />
            </div>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <EmojiPicker value={field.value} onChange={field.onChange} error={errors.icon?.message} />
              )}
            />
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label htmlFor={`${nameId}-parent`}>Proyecto padre</Label>
              <SelectField
                ariaLabel="Proyecto padre"
                value={selectedParentId ?? NO_PARENT_VALUE}
                onChange={(next) => setSelectedParentId(next === NO_PARENT_VALUE ? null : next)}
                options={parentOptions}
                placeholder="Sin padre"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`${nameId}-description`}>Descripción (opcional)</Label>
            <Textarea id={`${nameId}-description`} rows={3} {...register("description")} />
            {errors.description ? (
              <p role="alert" className="text-sm text-error">
                {errors.description.message}
              </p>
            ) : null}
          </div>

          {!isEditing && (
            <label className="flex items-center gap-1.5 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-3.5 rounded border-input accent-primary"
                {...register("isFavorite")}
              />
              Marcar como favorito
            </label>
          )}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear proyecto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
