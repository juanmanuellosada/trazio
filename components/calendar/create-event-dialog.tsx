"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCreateEvent } from "@/lib/calendar/use-create-event";
import type { EventInput } from "@/lib/calendar/events";
import { EventFormDialog, type EventFormValues } from "./event-form-dialog";

/**
 * Alta de evento (`alta-de-evento-completa`, D-A): capa fina sobre el
 * formulario compartido `EventFormDialog`, en modo alta. Sin alcance que
 * preguntar (eso solo existe al editar un evento que ya es parte de una
 * serie) y bloqueando el formulario entero si no hay ningún calendario
 * disponible: sin calendario no hay dónde guardar el evento nuevo, a
 * diferencia de editar, donde el evento ya tiene uno.
 *
 * El camino que sigue a elegir "Evento" en `CreateBlockChoiceDialog`, al
 * atajo `E` (`shortcut-provider.tsx`) y al acceso "Agregar evento" del
 * panel lateral (`sidebar-add-event.tsx`) — los tres terminan acá, sin una
 * segunda implementación.
 */
export function CreateEventDialog({
  open,
  onOpenChange,
  start,
  end,
  timezone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  start: Date;
  end: Date;
  timezone: string;
}) {
  const createEvent = useCreateEvent();

  function handleSubmit(values: EventFormValues) {
    const input: EventInput = {
      calendarId: values.calendarId,
      title: values.title,
      description: values.description,
      location: values.location,
      allDay: values.allDay,
      start: values.allDay ? format(values.start, "yyyy-MM-dd") : values.start.toISOString(),
      end: values.allDay ? format(values.end, "yyyy-MM-dd") : values.end.toISOString(),
      timeZone: timezone,
      recurrence: values.recurrence,
    };
    createEvent.mutate(input, { onSuccess: () => onOpenChange(false) });
  }

  const rangeLabel = `${format(start, "EEEE d 'de' MMMM, HH:mm", { locale: es })}–${format(end, "HH:mm", { locale: es })}`;

  return (
    <EventFormDialog
      open={open}
      onOpenChange={onOpenChange}
      dialogTitle="Evento nuevo"
      dialogDescription={rangeLabel}
      submitLabel="Crear evento"
      blockWhenNoCalendars
      isSubmitting={createEvent.isPending}
      initial={{
        title: "",
        calendarId: null,
        start,
        end,
        allDay: false,
        description: null,
        location: null,
        recurrence: null,
      }}
      onSubmit={handleSubmit}
    />
  );
}
