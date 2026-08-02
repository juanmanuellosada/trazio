"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarAdminError } from "./use-google-calendars";
import type { EventRecurrenceValue } from "./event-recurrence";

/**
 * La repetición vigente del evento maestro de una serie (tarea 3.1/3.4): sin
 * esto, abrir la edición de un evento recurrente no tendría forma de saber
 * si la regla que trae el formulario coincide con la que ya existe en
 * Google, y por lo tanto si cambió (la pregunta de la que depende el cruce
 * con el alcance de series, D-C). Solo se pide cuando `masterEventId` no es
 * `null`: un evento que no pertenece a ninguna serie no tiene nada que leer
 * acá, arranca directo en "no se repite".
 */
export function useEventRecurrenceRule(calendarId: string, masterEventId: string | null) {
  return useQuery({
    queryKey: ["calendar-events", "recurrence", calendarId, masterEventId] as const,
    queryFn: async (): Promise<EventRecurrenceValue> => {
      const response = await fetch(
        `/api/calendar/events/${encodeURIComponent(masterEventId!)}?calendarId=${encodeURIComponent(calendarId)}`,
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new CalendarAdminError(body?.error === "needs_reauth" || body?.error === "not_connected" ? body.error : "unknown");
      }
      const body = (await response.json()) as { recurrence: EventRecurrenceValue };
      return body.recurrence;
    },
    enabled: masterEventId !== null,
  });
}
