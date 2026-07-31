"use client";

import { useMutation } from "@tanstack/react-query";
import { toastSuccess } from "@/lib/toast";
import { reportCalendarAdminError, requestJson } from "./calendar-admin-mutations";
import type { CalendarEventInstance, EventInput } from "./events";

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
 * Sin caché de eventos que invalidar todavía (D-C: 60 segundos en memoria
 * del servidor, no en TanStack Query) — no existe ninguna lectura de
 * eventos montada en una pantalla (eso es del grupo 7), así que no hay
 * `queryKey` de lista que actualizar acá.
 */
export function useCreateEvent() {
  return useMutation({
    mutationKey: ["calendar-events", "create"] as const,
    mutationFn: (input: EventInput) => requestJson<CalendarEventInstance>("/api/calendar/events", "POST", input),
    onSuccess: () => toastSuccess("Evento creado."),
    onError: reportCalendarAdminError,
  });
}
