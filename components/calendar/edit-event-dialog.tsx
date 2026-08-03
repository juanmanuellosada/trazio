"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { AppDialog } from "@/components/primitives/dialog";
import { useUpdateEvent } from "@/lib/calendar/use-update-event";
import { useEventRecurrenceRule } from "@/lib/calendar/use-event-recurrence";
import { eventRecurrenceEquals, type EventRecurrenceValue } from "@/lib/calendar/event-recurrence";
import type { CalendarEventInstance, EventInput, RecurrenceEditScope } from "@/lib/calendar/events";
import { EventFormDialog, type EventFormValues } from "./event-form-dialog";
import { RecurrenceScopeDialog } from "./recurrence-scope-dialog";

/**
 * Edición de evento (`alta-de-evento-completa`, D-A): capa fina sobre el
 * formulario compartido `EventFormDialog`, en modo edición. Lo que sí
 * cambia respecto de crear es el alcance: si el evento es parte de una
 * serie, confirmar el formulario abre `RecurrenceScopeDialog` antes de
 * mutar nada — y si lo que cambió fue la propia regla de repetición, "esta
 * ocurrencia" deja de ofrecerse (tarea 3.4, riesgo principal: cambiar la
 * regla con alcance de una sola ocurrencia no significa nada).
 *
 * Antes de mostrar el formulario, si el evento es parte de una serie, se
 * pide la repetición vigente del maestro (`useEventRecurrenceRule`): sin
 * eso no habría forma de saber si la regla cambió. El formulario recién se
 * monta cuando esa repetición ya está resuelta (o falló, degradando a "no
 * se repite" como base de comparación) — el mismo criterio que
 * `CustomRecurrenceDialog` de sembrar el estado una sola vez al montar, acá
 * aplicado a cuándo montar el formulario entero, en vez de resincronizarlo
 * por efecto cuando el pedido de red termina después.
 *
 * `readOnly` (`hoy-con-eventos`, D-D): el calendario del evento no admite
 * escritura para esta cuenta. Se abre igual, pero `EventFormDialog` muestra
 * un resumen en vez del formulario — este componente no necesita leer la
 * repetición vigente para eso, así que ni siquiera espera a
 * `recurrenceReady` en ese caso.
 */
export function EditEventDialog({
  open,
  onOpenChange,
  event,
  timezone,
  readOnly = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEventInstance;
  timezone: string;
  /** El calendario de este evento es de solo lectura para esta cuenta (D-D): abre sin permitir editar. */
  readOnly?: boolean;
}) {
  const updateEvent = useUpdateEvent();
  const [pendingChanges, setPendingChanges] = useState<{ changes: EventInput; recurrenceChanged: boolean } | null>(null);

  const masterId = event.recurringEventId;
  const recurrenceQuery = useEventRecurrenceRule(event.calendarId, masterId);
  // Degradación (tarea 3.7, mismo criterio que el resto de `lib/calendar/`):
  // si Google no responde acá, se sigue con "no se repite" como base — no
  // rompe la edición del resto del evento, y si nadie toca la repetición,
  // `recurrenceChanged` da `false` y el cambio no se manda (no corrompe
  // nada, solo puede mostrar un valor inicial impreciso en el caso raro de
  // que esta lectura puntual falle).
  const initialRecurrence: EventRecurrenceValue = masterId === null ? null : (recurrenceQuery.data ?? null);
  const recurrenceReady = masterId === null || recurrenceQuery.isSuccess || recurrenceQuery.isError;

  function handleOpenChange(next: boolean) {
    if (!next) setPendingChanges(null);
    onOpenChange(next);
  }

  function submitChanges(changes: EventInput, scope?: RecurrenceEditScope) {
    updateEvent.mutate(
      {
        target: {
          calendarId: event.calendarId,
          eventId: event.id,
          recurringEventId: event.recurringEventId,
          originalStartTime: event.originalStartTime,
        },
        changes,
        scope,
      },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  function handleFormSubmit(values: EventFormValues) {
    const recurrenceChanged = !eventRecurrenceEquals(values.recurrence, initialRecurrence);
    const changes: EventInput = {
      calendarId: values.calendarId,
      title: values.title,
      description: values.description,
      location: values.location,
      allDay: values.allDay,
      start: values.allDay ? format(values.start, "yyyy-MM-dd") : values.start.toISOString(),
      end: values.allDay ? format(values.end, "yyyy-MM-dd") : values.end.toISOString(),
      timeZone: values.allDay ? timezone : (event.timeZone ?? timezone),
      // Solo se manda si cambió (tarea 3.4): omitirlo cuando no cambió deja
      // la recurrencia existente intacta en Google, con cualquier `EXDATE`
      // de excepciones sueltas que ya tuviera.
      recurrence: recurrenceChanged ? values.recurrence : undefined,
    };

    if (event.recurringEventId !== null) {
      setPendingChanges({ changes, recurrenceChanged });
      return;
    }
    submitChanges(changes);
  }

  if (!readOnly && !recurrenceReady) {
    return (
      <AppDialog open={open} onOpenChange={handleOpenChange} title="Editar evento" size="lg">
        <p className="text-sm text-muted-foreground">Cargando el evento…</p>
      </AppDialog>
    );
  }

  return (
    <>
      <EventFormDialog
        open={open}
        onOpenChange={handleOpenChange}
        dialogTitle={readOnly ? "Evento" : "Editar evento"}
        dialogDescription={
          readOnly ? undefined : "Cambiá el título, el calendario, el horario, la repetición, la descripción o la ubicación."
        }
        submitLabel="Guardar cambios"
        blockWhenNoCalendars={false}
        isSubmitting={updateEvent.isPending}
        readOnly={readOnly}
        initial={{
          title: event.title,
          calendarId: event.calendarId,
          // `parseISO`, no `new Date(string)`: `event.start`/`event.end` de
          // un evento de todo el día son `yyyy-MM-dd` sin hora, y el
          // constructor nativo los interpreta como medianoche UTC, no local
          // — un día de menos en cualquier huso detrás de UTC (Argentina
          // incluida). `parseISO` de `date-fns` sí los toma como medianoche
          // local, igual que ya hacía `DateField` con estas mismas fechas.
          start: parseISO(event.start),
          end: parseISO(event.end),
          allDay: event.allDay,
          description: event.description,
          location: event.location,
          recurrence: initialRecurrence,
        }}
        onSubmit={handleFormSubmit}
      />

      {pendingChanges && (
        <RecurrenceScopeDialog
          open
          onOpenChange={(next) => !next && setPendingChanges(null)}
          action="editar"
          excludeThisOccurrence={pendingChanges.recurrenceChanged}
          onConfirm={(scope) => {
            submitChanges(pendingChanges.changes, scope);
            setPendingChanges(null);
          }}
        />
      )}
    </>
  );
}
