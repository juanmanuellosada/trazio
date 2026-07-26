"use client";

import { useEffect, useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { projectFormSchema, type ProjectFormOutput, type ProjectFormValues } from "@/lib/validation/projects";
import { PROJECT_COLOR_IDS } from "@/lib/validation/colors";
import { useCreateProject, useUpdateProject } from "@/lib/projects/mutations";
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
import { ColorSwatchPicker } from "./color-swatch-picker";
import { EmojiIconInput } from "./emoji-icon-input";

const DEFAULT_VALUES: ProjectFormValues = {
  name: "",
  color: PROJECT_COLOR_IDS[0],
  icon: undefined,
  description: undefined,
};

/**
 * Diálogo de crear/editar proyecto (bloque 6.2). El mismo formulario cubre
 * los dos casos: sin `project` crea (opcionalmente como subproyecto de
 * `parentId`), con `project` edita ese proyecto.
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  parentId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectRow;
  parentId?: string | null;
}) {
  const nameId = useId();
  const isEditing = !!project;
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const pending = createProject.isPending || updateProject.isPending;

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
            color: project.color,
            icon: project.icon ?? undefined,
            description: project.description ?? undefined,
          }
        : DEFAULT_VALUES,
    );
  }, [open, project, reset]);

  async function onSubmit(values: ProjectFormOutput) {
    if (project) {
      await updateProject.mutateAsync({ id: project.id, patch: values });
    } else {
      await createProject.mutateAsync({ ...values, parentId });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar proyecto" : "Nuevo proyecto"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Cambiá el nombre, el color, el ícono o la descripción."
              : "Elegí un nombre, un color de la paleta y, si querés, un ícono."}
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
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <ColorSwatchPicker
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.color?.message}
                />
              )}
            />
            <EmojiIconInput registration={register("icon")} error={errors.icon?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${nameId}-description`}>Descripción (opcional)</Label>
            <Textarea id={`${nameId}-description`} rows={3} {...register("description")} />
            {errors.description ? (
              <p role="alert" className="text-sm text-error">
                {errors.description.message}
              </p>
            ) : null}
          </div>

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
