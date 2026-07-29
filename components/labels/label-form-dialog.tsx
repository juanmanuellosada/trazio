"use client";

import { useEffect, useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { labelFormSchema, type LabelFormOutput, type LabelFormValues } from "@/lib/validation/labels";
import { PROJECT_COLOR_IDS } from "@/lib/validation/colors";
import { useCreateLabel, useUpdateLabel } from "@/lib/labels/mutations";
import type { LabelChip } from "@/lib/tasks/use-tasks";
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
import { ColorSwatchPicker } from "@/components/projects/color-swatch-picker";

const DEFAULT_VALUES: LabelFormValues = {
  name: "",
  color: PROJECT_COLOR_IDS[0],
};

/**
 * Diálogo de crear/editar etiqueta (bloque 4.2/4.3, capacidad
 * `administracion-de-etiquetas`): mismo patrón que
 * `components/projects/project-form-dialog.tsx` pero mucho más chico — una
 * etiqueta no tiene ícono, descripción, padre ni favorito, así que el
 * formulario es solo nombre y color. El selector de color reusa
 * `ColorSwatchPicker` tal cual (mismo componente que usa el modal de
 * proyecto, con el mismo `Controller`), como pide el requirement "El color
 * de la etiqueta usa el mismo selector que el color de proyecto".
 */
export function LabelFormDialog({
  open,
  onOpenChange,
  label,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: LabelChip;
}) {
  const nameId = useId();
  const isEditing = !!label;
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const pending = createLabel.isPending || updateLabel.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LabelFormValues, unknown, LabelFormOutput>({
    resolver: zodResolver(labelFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    reset(label ? { name: label.name, color: label.color } : DEFAULT_VALUES);
  }, [open, label, reset]);

  async function onSubmit(values: LabelFormOutput) {
    if (label) {
      await updateLabel.mutateAsync({ id: label.id, patch: values });
    } else {
      await createLabel.mutateAsync(values);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar etiqueta" : "Nueva etiqueta"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Cambiá el nombre o el color de la etiqueta."
              : "Elegí un nombre y un color para la etiqueta."}
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

          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <ColorSwatchPicker value={field.value} onChange={field.onChange} error={errors.color?.message} />
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear etiqueta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
