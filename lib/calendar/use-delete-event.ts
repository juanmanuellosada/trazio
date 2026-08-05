"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toastSuccess } from "@/lib/toast";
import { reportCalendarAdminError, requestJson } from "./calendar-admin-mutations";
import type { EventsResult, OccurrenceTarget, RecurrenceEditScope } from "./events";

/**
 * Elimina un evento (D-D de `hoy-con-eventos`, tarea 4.3): el primer camino
 * de borrado de evento de toda la app — hasta esta tanda, `deleteEvent` de
 * `lib/calendar/events.ts` y la ruta `DELETE /api/calendar/events/[eventId]`
 * ya existían (tarea 3.4/3.5), pero ningún cliente los llamaba todavía.
 *
 * Mismo `predicate` de caché que `use-update-event.ts` (`isCalendarEventsQuery`,
 * duplicado acá en vez de exportado — mismo criterio de `use-create-event.ts`
 * de no compartir ese detalle entre los tres hooks de mutación de eventos):
 * un evento puede estar en la caché de rango del calendario y en la de "hoy"
 * a la vez, y las dos comparten la forma `EventsResult`.
 *
 * Sin optimistic update, a diferencia de `useUpdateEvent`: mismo criterio
 * que `useDeleteCalendar` (`calendar-admin-mutations.ts`) para una acción
 * irreversible desde Trazio — se espera la confirmación del servidor antes
 * de sacarlo de la lista, en vez de sacarlo antes y arriesgarse a tener que
 * devolverlo si Google lo rechaza.
 */

function isCalendarEventsQuery(query: { queryKey: readonly unknown[] }): boolean {
  return query.queryKey[0] === "calendar-events" && (query.queryKey[1] === "range" || query.queryKey[1] === "today");
}

/**
 * `eventId` solo (sin `calendarId`) no identifica un evento sin ambigüedad:
 * Google no garantiza que sea único entre calendarios distintos de la misma
 * cuenta (defecto encontrado al verificar el grupo 7 de
 * `calendario-legible-y-manipulable`, mismo motivo que `eventBlockId` en
 * `screen-blocks.ts`). Sin el `calendarId` acá, borrar un evento cuyo id
 * colisiona con el de otro calendario también lo sacaba del caché.
 */
function removeEventFromCache(queryClient: QueryClient, calendarId: string, eventId: string) {
  queryClient.setQueriesData<EventsResult>({ predicate: isCalendarEventsQuery }, (old) => {
    if (!old || old.status !== "ok") return old;
    return { ...old, events: old.events.filter((event) => !(event.id === eventId && event.calendarId === calendarId)) };
  });
}

export type DeleteEventVariables = {
  target: OccurrenceTarget;
  /** Obligatorio en cuanto `target.recurringEventId` no es `null` — sin default silencioso (tarea 3.6), quien llama ya tuvo que preguntar con `RecurrenceScopeDialog` antes de llegar acá. */
  scope?: RecurrenceEditScope;
};

function eventDeleteUrl({ target, scope }: DeleteEventVariables): string {
  const params = new URLSearchParams({ calendarId: target.calendarId });
  if (target.recurringEventId) params.set("recurringEventId", target.recurringEventId);
  if (target.originalStartTime) params.set("originalStartTime", target.originalStartTime);
  if (scope) params.set("scope", scope);
  return `/api/calendar/events/${encodeURIComponent(target.eventId)}?${params.toString()}`;
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["calendar-events", "delete"] as const,
    mutationFn: (variables: DeleteEventVariables) => requestJson<{ ok: true }>(eventDeleteUrl(variables), "DELETE"),
    onSuccess: (_data, { target }) => {
      removeEventFromCache(queryClient, target.calendarId, target.eventId);
      toastSuccess("Evento eliminado.");
    },
    onError: reportCalendarAdminError,
    onSettled: () => queryClient.invalidateQueries({ predicate: isCalendarEventsQuery }),
  });
}
