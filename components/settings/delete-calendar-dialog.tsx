"use client";

import { useDeleteCalendar } from "@/lib/calendar/calendar-admin-mutations";
import type { GoogleCalendarListItem } from "@/lib/calendar/use-google-calendars";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";

/**
 * Confirmación de borrado de un calendario de Google (tarea 4.4): el punto
 * más importante de esta tanda. `calendars.delete` no es "sacarlo de la
 * vista de Trazio" —para eso está la selección de calendarios visibles,
 * ya resuelta por la tanda anterior (capacidad `conexion-google-calendar`,
 * `enabled_calendar_ids`)—, es borrar el calendario y todos sus eventos de
 * la cuenta de Google entera. El texto lo dice así de explícito, sin
 * eufemismos: alguien que crea que está ocultando un calendario y termine
 * borrando años de eventos ajenos es el peor resultado posible de esta
 * fase.
 *
 * Por D5, `ConfirmDialog` con `destructive` usa el `--error` semántico
 * (mapeado a `--color-destructive` en `app/globals.css`), nunca el rojo de
 * marca `#EC1E2A`.
 */
export function DeleteCalendarDialog({
  open,
  onOpenChange,
  calendar,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: GoogleCalendarListItem;
}) {
  const deleteCalendar = useDeleteCalendar();

  function handleConfirm() {
    deleteCalendar.mutate(calendar.id);
    onOpenChange(false);
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Eliminar “${calendar.summary}”`}
      description="Esto borra el calendario y todos sus eventos de tu cuenta de Google entera, no solo de Trazio. El cambio se ve en cualquier aplicación conectada a esa cuenta —el teléfono, la web de Google Calendar, cualquier otra app— y no se puede deshacer desde acá."
      confirmLabel="Eliminar de tu cuenta de Google"
      destructive
      onConfirm={handleConfirm}
    />
  );
}
