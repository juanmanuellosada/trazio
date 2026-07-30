"use client";

import { useEffect, useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { filterFormSchema, type FilterFormOutput, type FilterFormValues } from "@/lib/validation/filters";
import { PROJECT_COLOR_IDS } from "@/lib/validation/colors";
import { useCreateFilter, useUpdateFilter } from "@/lib/filters/mutations";
import { useFilterPreviewCount } from "@/lib/filters/use-filter-preview";
import type { FilterRow } from "@/lib/filters/use-filters";
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
import { ColorSwatchPicker } from "@/components/projects/color-swatch-picker";
import { EmojiPicker } from "@/components/projects/emoji-picker";

const DEFAULT_VALUES: FilterFormValues = {
  name: "",
  query: "",
  color: PROJECT_COLOR_IDS[0],
  icon: undefined,
  isFavorite: false,
};

/**
 * Diálogo de crear/editar filtro (bloque 2.13/2.15/2.16): mismo formulario
 * para los dos casos, mismo patrón que `ProjectFormDialog`. La consulta
 * muestra su vista previa en vivo (`useFilterPreviewCount`, debounce de
 * 300ms): un conteo de coincidencias mientras se escribe, o el error de
 * sintaxis en español si el parser no puede interpretarla todavía.
 */
export function FilterFormDialog({
  open,
  onOpenChange,
  filter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter?: FilterRow;
}) {
  const nameId = useId();
  const isEditing = !!filter;
  const createFilter = useCreateFilter();
  const updateFilter = useUpdateFilter();
  const pending = createFilter.isPending || updateFilter.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FilterFormValues, unknown, FilterFormOutput>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const queryValue = useWatch({ control, name: "query" }) ?? "";
  const preview = useFilterPreviewCount(queryValue);

  useEffect(() => {
    if (!open) return;
    reset(
      filter
        ? {
            name: filter.name,
            query: filter.query,
            color: filter.color,
            icon: filter.icon ?? undefined,
            isFavorite: filter.is_favorite,
          }
        : DEFAULT_VALUES,
    );
  }, [open, filter, reset]);

  async function onSubmit(values: FilterFormOutput) {
    if (filter) {
      await updateFilter.mutateAsync({
        id: filter.id,
        patch: { name: values.name, query: values.query, color: values.color, icon: values.icon },
      });
    } else {
      await createFilter.mutateAsync(values);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar filtro" : "Nuevo filtro"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Cambiá el nombre, la consulta, el color o el ícono del filtro."
              : "Elegí un nombre y escribí la consulta que va a guardar este filtro."}
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

          <div className="space-y-1.5">
            <Label htmlFor={`${nameId}-query`}>Consulta</Label>
            <Textarea
              id={`${nameId}-query`}
              rows={2}
              placeholder="priority:1,2 & due:next7days & !label:espera"
              className="font-mono text-sm"
              aria-invalid={!!errors.query}
              {...register("query")}
            />
            {errors.query ? (
              <p role="alert" className="text-sm text-error">
                {errors.query.message}
              </p>
            ) : preview.status === "error" ? (
              <p role="alert" className="text-sm text-error">
                {preview.message}
              </p>
            ) : preview.status === "listo" ? (
              <p className="text-sm text-text-secondary">
                {preview.count} {preview.count === 1 ? "tarea coincide" : "tareas coinciden"}
              </p>
            ) : preview.status === "cargando" ? (
              <p className="text-sm text-text-secondary">Contando…</p>
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
              {pending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear filtro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
