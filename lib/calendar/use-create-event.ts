"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toastSuccess } from "@/lib/toast";
import { reportCalendarAdminError, requestJson } from "./calendar-admin-mutations";
import type { CalendarEventInstance, EventInput } from "./events";

function isRangeEventsQuery(query: { queryKey: readonly unknown[] }): boolean {
  return query.queryKey[0] === "calendar-events" && query.queryKey[1] === "range";
}

/**
 * Crea un evento (tarea 6.7/6.8): el camino que respalda tanto "crear
 * arrastrando sobre espacio vacío" (`CreateBlockChoiceDialog` +
 * `CreateEventDialog` en `components/calendar/`) como, más adelante, el
 * "botón de nuevo evento" propio del grupo 7 (tarea 7.6) — D-G exige que
 * los dos caminos existan, y los dos terminan llamando a este mismo hook
 * en vez de duplicar la lógica de creación.
 *
 * Mismo `requestJson`/códigos de error que
 * `lib/calendar/calendar-admin-mutations.ts`: las rutas bajo
 * `app/api/calendar/` devuelven el mismo vocabulario
 * (`not_connected`/`needs_reauth`/`google_transient`/`unknown`).
 *
 * Invalida cualquier query de rango (`useCalendarRangeEvents`) al terminar
 * — mismo criterio que `use-update-event.ts` — para que el evento recién
 * creado aparezca en la grilla sin recargar la página.
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["calendar-events", "create"] as const,
    mutationFn: (input: EventInput) => requestJson<CalendarEventInstance>("/api/calendar/events", "POST", input),
    onSuccess: () => toastSuccess("Evento creado."),
    onError: reportCalendarAdminError,
    onSettled: () => queryClient.invalidateQueries({ predicate: isRangeEventsQuery }),
  });
}
