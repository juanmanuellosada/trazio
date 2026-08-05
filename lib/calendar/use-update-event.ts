"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toastSuccess } from "@/lib/toast";
import { reportCalendarAdminError, requestJson } from "./calendar-admin-mutations";
import type { CalendarEventInstance, EventInput, EventsResult, OccurrenceTarget, RecurrenceEditScope } from "./events";

/**
 * Edita un evento existente (D24, tarea 7.11/8.4 — el hueco que la tarea
 * 7.11 dejó documentado: mover/redimensionar un bloque de evento hoy solo
 * avisaba con un toast, sin mutar nada). Mismo `requestJson`/vocabulario de
 * error que `use-create-event.ts`, con optimistic update y reversión
 * (`.claude/rules/frontend.md`, requirement "mover") sobre el caché de
 * `useCalendarRangeEvents`.
 *
 * A diferencia de `useUpdateTask` (una sola `queryKey` por proyecto), acá
 * no hay una única caché "canónica": `useCalendarRangeEvents` cachea por
 * rango exacto de días visibles y `useTodayEvents` (`hoy-con-eventos`) por
 * el día de hoy solo, así que el mismo evento puede estar presente en
 * varias queries a la vez (semana actual, mes actual, hoy) — se parchea con
 * un `predicate` cualquier query de eventos que lo tenga, en vez de una
 * `queryKey` fija. Las dos formas de caché comparten la misma forma
 * (`EventsResult`), así que un solo `predicate` alcanza para las dos.
 */

function isCalendarEventsQuery(query: { queryKey: readonly unknown[] }): boolean {
  return query.queryKey[0] === "calendar-events" && (query.queryKey[1] === "range" || query.queryKey[1] === "today");
}

/**
 * `eventId` solo (sin `calendarId`) no identifica un evento sin ambigüedad:
 * Google no garantiza que sea único entre calendarios distintos de la misma
 * cuenta (defecto encontrado al verificar el grupo 7 de
 * `calendario-legible-y-manipulable`, mismo motivo que `eventBlockId` en
 * `screen-blocks.ts`). Sin el `calendarId` acá, editar un evento cuyo id
 * colisiona con el de otro calendario parcheaba también ese otro en el
 * caché optimista.
 */
function patchEventInCache(queryClient: QueryClient, calendarId: string, eventId: string, changes: EventInput) {
  queryClient.setQueriesData<EventsResult>({ predicate: isCalendarEventsQuery }, (old) => {
    if (!old || old.status !== "ok") return old;
    return {
      ...old,
      events: old.events.map((event) =>
        event.id === eventId && event.calendarId === calendarId ? { ...event, ...changes } : event,
      ),
    };
  });
}

export type UpdateEventVariables = {
  target: OccurrenceTarget;
  changes: EventInput;
  /** Obligatorio en cuanto `target.recurringEventId` no es `null` — sin default silencioso (tarea 3.6), quien llama ya tuvo que preguntar con `RecurrenceScopeDialog` antes de llegar acá. */
  scope?: RecurrenceEditScope;
};

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["calendar-events", "update"] as const,
    mutationFn: ({ target, changes, scope }: UpdateEventVariables) =>
      requestJson<CalendarEventInstance>(`/api/calendar/events/${encodeURIComponent(target.eventId)}`, "PATCH", {
        calendarId: target.calendarId,
        recurringEventId: target.recurringEventId,
        originalStartTime: target.originalStartTime,
        scope,
        changes,
      }),
    onMutate: async ({ target, changes }) => {
      await queryClient.cancelQueries({ predicate: isCalendarEventsQuery });
      const previous = queryClient.getQueriesData<EventsResult>({ predicate: isCalendarEventsQuery });
      patchEventInCache(queryClient, target.calendarId, target.eventId, changes);
      return { previous };
    },
    onError: (error, _vars, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      reportCalendarAdminError(error);
    },
    onSuccess: () => toastSuccess("Evento editado."),
    onSettled: () => queryClient.invalidateQueries({ predicate: isCalendarEventsQuery }),
  });
}
