"use client";

import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { calendarFormSchema, type CalendarFormOutput, type CalendarFormValues } from "@/lib/validation/calendars";
import { useCreateCalendar, useRecolorCalendar, useRenameCalendar } from "@/lib/calendar/calendar-admin-mutations";
import { useCalendarColorOptions, type GoogleCalendarListItem } from "@/lib/calendar/use-google-calendars";
import { cn } from "@/lib/utils";
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

const DEFAULT_VALUES: CalendarFormValues = { name: "" };

/**
 * Diálogo de crear/editar un calendario de Google (tarea 4.1/4.2): al
 * crear solo pide el nombre (la escena "Crear un calendario nuevo" del
 * requirement no pide color); al editar suma la grilla de colores que
 * admite Google (tarea 4.3) — nunca la paleta fija de Trazio (D19), ver el
 * comentario al principio de `lib/calendar/google-calendars-client.ts`.
 *
 * Mismo patrón que `components/labels/label-form-dialog.tsx` (un solo
 * diálogo para crear y editar), pero acá el formulario cambia de forma
 * según el modo en vez de mostrar siempre los mismos campos: crear no
 * ofrece color porque Google todavía no le asignó ninguno reconocible.
 *
 * El contenido vive en `CalendarFormDialogContent`, remontado con una
 * `key` por cada apertura y por calendario editado: así el estado local
 * (el formulario y el color elegido) arranca limpio en cada uso sin
 * necesitar un efecto que lo resetee a mano.
 */
export function CalendarFormDialog({
  open,
  onOpenChange,
  calendar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar?: GoogleCalendarListItem;
}) {
  return (
    <CalendarFormDialogContent
      key={`${open}-${calendar?.id ?? "create"}`}
      open={open}
      onOpenChange={onOpenChange}
      calendar={calendar}
    />
  );
}

function CalendarFormDialogContent({
  open,
  onOpenChange,
  calendar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar?: GoogleCalendarListItem;
}) {
  const nameId = useId();
  const isEditing = !!calendar;
  const createCalendar = useCreateCalendar();
  const renameCalendar = useRenameCalendar();
  const recolorCalendar = useRecolorCalendar();
  const pending = createCalendar.isPending || renameCalendar.isPending || recolorCalendar.isPending;

  const {
    data: colorOptions,
    isLoading: loadingColors,
    isError: colorsErrored,
  } = useCalendarColorOptions(open && isEditing);

  // El color que ya tiene el calendario, resuelto buscando entre los que
  // admite Google (tarea 4.3) cuál tiene el mismo hex que
  // `calendar.backgroundColor` (ya lo trae el listado de la tarea 2.7). Se
  // deriva del render en vez de guardarse con un efecto: si no matchea
  // ninguno —color personalizado vía `backgroundColor`/`foregroundColor`,
  // fuera de alcance acá—, queda `undefined` y no hay nada preseleccionado.
  const currentColorId = calendar?.backgroundColor
    ? colorOptions?.find((option) => option.background.toLowerCase() === calendar.backgroundColor?.toLowerCase())?.id
    : undefined;

  // Lo que la persona eligió en esta apertura, si tocó algún swatch.
  // `selectedColorId` es lo que se ve marcado en la grilla: la elección
  // explícita si la hay, si no el color que ya tenía.
  const [colorOverride, setColorOverride] = useState<string | undefined>(undefined);
  const selectedColorId = colorOverride ?? currentColorId;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CalendarFormValues, unknown, CalendarFormOutput>({
    resolver: zodResolver(calendarFormSchema),
    defaultValues: calendar ? { name: calendar.summary } : DEFAULT_VALUES,
  });

  async function onSubmit(values: CalendarFormOutput) {
    if (calendar) {
      if (values.name !== calendar.summary) {
        await renameCalendar.mutateAsync({ calendarId: calendar.id, name: values.name });
      }
      if (selectedColorId && selectedColorId !== currentColorId) {
        await recolorCalendar.mutateAsync({ calendarId: calendar.id, colorId: selectedColorId });
      }
    } else {
      await createCalendar.mutateAsync(values.name);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar calendario" : "Nuevo calendario"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Cambiá el nombre o el color. Se actualiza en tu cuenta de Google conectada."
              : "Se crea un calendario nuevo en tu cuenta de Google conectada."}
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

          {isEditing ? (
            <div className="space-y-1.5">
              <Label>Color</Label>
              {loadingColors ? (
                <p className="text-sm text-text-secondary">Cargando los colores que admite Google…</p>
              ) : colorsErrored || !colorOptions ? (
                <p className="text-sm text-text-secondary">
                  No pudimos cargar los colores de Google ahora. Podés guardar el nombre igual.
                </p>
              ) : (
                <div role="group" aria-label="Color del calendario" className="flex flex-wrap gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selectedColorId === option.id}
                      aria-label={`Color ${option.id} de Google`}
                      onClick={() => setColorOverride(option.id)}
                      className={cn(
                        "size-9 shrink-0 cursor-pointer rounded-full border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        selectedColorId === option.id ? "border-foreground" : "border-transparent",
                      )}
                      style={{ backgroundColor: option.background }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear calendario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
