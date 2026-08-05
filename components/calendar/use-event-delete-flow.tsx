"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/primitives/confirm-dialog";
import type { CalendarEventInstance, RecurrenceEditScope } from "@/lib/calendar/events";
import { useDeleteEvent } from "@/lib/calendar/use-delete-event";
import { RecurrenceScopeDialog } from "./recurrence-scope-dialog";

/**
 * Borrado de un evento con su confirmación (grupo 7 de
 * `calendario-legible-y-manipulable`): extraído de `HoyEventRow`, su único
 * consumidor hasta esta tanda, para no triplicarlo — ahora también lo usan
 * `EditEventDialog` (borrar desde el diálogo de edición) y el menú
 * contextual de un bloque de evento en la grilla (`screen-calendar.tsx`).
 * Misma pregunta de alcance si el evento pertenece a una serie
 * (`RecurrenceScopeDialog`), y la misma confirmación que ya avisa que borra
 * de la cuenta de Google entera, no solo de Trazio.
 *
 * `requestDelete` recibe el evento como argumento (no un evento fijado de
 * antemano): así los tres consumidores comparten una sola instancia del
 * hook sin pelearse por "cuál evento está pendiente de borrar" en un
 * cierre desactualizado.
 */
export function useEventDeleteFlow(onDeleted?: () => void) {
  const [target, setTarget] = useState<CalendarEventInstance | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [choosingScope, setChoosingScope] = useState(false);
  const deleteEvent = useDeleteEvent();

  function runDelete(scope?: RecurrenceEditScope) {
    if (!target) return;
    deleteEvent.mutate(
      {
        target: {
          calendarId: target.calendarId,
          eventId: target.id,
          recurringEventId: target.recurringEventId,
          originalStartTime: target.originalStartTime,
        },
        scope,
      },
      {
        onSuccess: () => {
          setTarget(null);
          onDeleted?.();
        },
      },
    );
  }

  function requestDelete(event: CalendarEventInstance) {
    setTarget(event);
    if (event.recurringEventId !== null) {
      setChoosingScope(true);
      return;
    }
    setConfirmingDelete(true);
  }

  const dialogs = target && (
    <>
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={`Eliminar “${target.title}”`}
        description="Esto borra el evento de tu cuenta de Google entera, no solo de Trazio, y no se puede deshacer desde acá."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          runDelete();
          setConfirmingDelete(false);
        }}
      />

      {choosingScope && (
        <RecurrenceScopeDialog
          open
          onOpenChange={setChoosingScope}
          action="eliminar"
          onConfirm={(scope) => {
            runDelete(scope);
            setChoosingScope(false);
          }}
        />
      )}
    </>
  );

  return { requestDelete, dialogs };
}
