"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import type { CalendarEventInstance, RecurrenceEditScope } from "@/lib/calendar/events";
import { useDeleteEvent } from "@/lib/calendar/use-delete-event";
import { EditEventDialog } from "./edit-event-dialog";
import { EventRow } from "./event-row";
import { RecurrenceScopeDialog } from "./recurrence-scope-dialog";

/**
 * Fila de evento de Hoy, con sus tres acciones ya resueltas (`hoy-con-eventos`,
 * D-D): esta es la pieza de `components/calendar/` que `hoy-view.tsx` monta
 * por cada evento de la secuencia, sin tener que orquestar ella misma el
 * diálogo de edición, la confirmación de borrado ni el cruce de recurrencia
 * — así `components/tasks/` sigue sin conocer nada de `lib/calendar/`
 * (`use-hoy-events.ts` resuelve `calendarName`/`canEdit`, esta fila resuelve
 * las acciones).
 *
 * Eliminar: sin optimistic update ni undo, igual que borrar un calendario
 * entero (`delete-calendar-dialog.tsx`) — es irreversible desde Trazio y no
 * hay forma de deshacerlo como con una tarea, así que se confirma antes. Si
 * el evento pertenece a una serie, la pregunta es a cuáles ocurrencias
 * aplica (`RecurrenceScopeDialog`, misma obligación que editar); si no,
 * alcanza con una confirmación simple.
 *
 * Abrir en Google Calendar: usa `event.htmlLink`, el enlace que ya trae la
 * respuesta de Google. Sin enlace (evento sin `htmlLink`, caso raro) no
 * hace nada — el ítem del menú sigue ahí porque sacarlo dinámicamente por
 * fila complicaría el menú más de lo que vale para un caso así de raro.
 */
export function HoyEventRow({
  event,
  calendarName,
  canEdit,
  timezone,
  now,
}: {
  event: CalendarEventInstance;
  calendarName: string;
  canEdit: boolean;
  timezone: string;
  /** Para que `EventRow` sepa si el evento viene de ayer o sigue mañana. */
  now: Date;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [choosingDeleteScope, setChoosingDeleteScope] = useState(false);
  const deleteEvent = useDeleteEvent();

  function runDelete(scope?: RecurrenceEditScope) {
    deleteEvent.mutate({
      target: {
        calendarId: event.calendarId,
        eventId: event.id,
        recurringEventId: event.recurringEventId,
        originalStartTime: event.originalStartTime,
      },
      scope,
    });
  }

  function handleDelete() {
    if (event.recurringEventId !== null) {
      setChoosingDeleteScope(true);
      return;
    }
    setConfirmingDelete(true);
  }

  function handleOpenInGoogleCalendar() {
    if (event.htmlLink) window.open(event.htmlLink, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <EventRow
        event={event}
        calendarName={calendarName}
        canEdit={canEdit}
        now={now}
        onEdit={() => setEditing(true)}
        onOpenInGoogleCalendar={handleOpenInGoogleCalendar}
        onDelete={handleDelete}
      />

      {editing && <EditEventDialog open onOpenChange={setEditing} event={event} timezone={timezone} readOnly={!canEdit} />}

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Eliminar “${event.title}”`}
        description="Esto borra el evento de tu cuenta de Google entera, no solo de Trazio, y no se puede deshacer desde acá."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          runDelete();
          setConfirmingDelete(false);
        }}
      />

      {choosingDeleteScope && (
        <RecurrenceScopeDialog
          open
          onOpenChange={setChoosingDeleteScope}
          action="eliminar"
          onConfirm={(scope) => {
            runDelete(scope);
            setChoosingDeleteScope(false);
          }}
        />
      )}
    </>
  );
}
