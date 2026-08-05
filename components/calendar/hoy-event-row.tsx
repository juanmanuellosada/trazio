"use client";

import { useState } from "react";
import type { CalendarEventInstance } from "@/lib/calendar/events";
import { EditEventDialog } from "./edit-event-dialog";
import { EventRow } from "./event-row";
import { useEventDeleteFlow } from "./use-event-delete-flow";

/**
 * Fila de evento de Hoy, con sus tres acciones ya resueltas (`hoy-con-eventos`,
 * D-D): esta es la pieza de `components/calendar/` que `hoy-view.tsx` monta
 * por cada evento de la secuencia, sin tener que orquestar ella misma el
 * diálogo de edición, la confirmación de borrado ni el cruce de recurrencia
 * — así `components/tasks/` sigue sin conocer nada de `lib/calendar/`
 * (`use-hoy-events.ts` resuelve `calendarName`/`canEdit`, esta fila resuelve
 * las acciones).
 *
 * Eliminar: `useEventDeleteFlow` (grupo 7 de `calendario-legible-y-manipulable`,
 * compartido también con `EditEventDialog` y el menú contextual de la
 * grilla) — sin optimistic update ni undo, igual que borrar un calendario
 * entero (`delete-calendar-dialog.tsx`): es irreversible desde Trazio, así
 * que se confirma antes.
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
  const eventDelete = useEventDeleteFlow();

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
        onDelete={() => eventDelete.requestDelete(event)}
      />

      {editing && (
        <EditEventDialog
          open
          onOpenChange={setEditing}
          event={event}
          timezone={timezone}
          readOnly={!canEdit}
          onRequestDelete={
            canEdit
              ? () => {
                  setEditing(false);
                  eventDelete.requestDelete(event);
                }
              : undefined
          }
        />
      )}

      {eventDelete.dialogs}
    </>
  );
}
