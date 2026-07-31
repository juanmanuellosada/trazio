"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toastError, toastSuccess } from "@/lib/toast";
import { CalendarAdminError, googleCalendarsQueryKey, type CalendarAdminErrorCode } from "./use-google-calendars";

/**
 * Mutaciones de la administración de calendarios (tarea 4.1): crear,
 * renombrar, recolorear y eliminar. `mutationKey` común, mismo patrón que
 * `LABELS_MUTATION_KEY`/`PROJECTS_MUTATION_KEY`.
 */
export const CALENDAR_ADMIN_MUTATION_KEY = ["calendar-admin"] as const;

const MENSAJES: Record<CalendarAdminErrorCode | "network", { quePaso: string; porQue: string; queHacer: string }> = {
  not_connected: {
    quePaso: "No pudimos completar la acción",
    porQue: "no hay ninguna cuenta de Google conectada",
    queHacer: "Conectá tu cuenta de Google y volvé a intentar.",
  },
  needs_reauth: {
    quePaso: "No pudimos completar la acción",
    porQue: "la conexión con Google necesita reconectarse",
    queHacer: "Reconectá tu cuenta de Google y volvé a intentar.",
  },
  google_transient: {
    quePaso: "No pudimos completar la acción",
    porQue: "Google no respondió",
    queHacer: "Volvé a intentar en un momento.",
  },
  insufficient_scope: {
    quePaso: "No pudimos completar la acción",
    porQue: "la conexión no tiene el permiso completo para administrar calendarios",
    queHacer: "Reconectá tu cuenta de Google desde Configuración y volvé a intentar.",
  },
  network: {
    quePaso: "No pudimos completar la acción",
    porQue: "se cortó la conexión",
    queHacer: "Revisá tu internet y volvé a intentar.",
  },
  unknown: {
    quePaso: "No pudimos completar la acción",
    porQue: "algo falló de nuestro lado",
    queHacer: "Volvé a intentar en un momento.",
  },
};

function classify(error: unknown): keyof typeof MENSAJES {
  if (error instanceof CalendarAdminError) return error.code;
  const message = error instanceof Error ? error.message : "";
  if (/fetch|network/i.test(message)) return "network";
  return "unknown";
}

export function reportCalendarAdminError(error: unknown): void {
  const { quePaso, porQue, queHacer } = MENSAJES[classify(error)];
  toastError(quePaso, porQue, queHacer);
}

function invalidateGoogleCalendars(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: googleCalendarsQueryKey });
}

/** Exportado para que otros módulos de `lib/calendar/` (p. ej. `use-create-event.ts`, tarea 6.7/6.8) reusen el mismo mapeo de códigos de error de las rutas bajo `app/api/calendar/` en vez de duplicarlo. */
export async function requestJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
    const code = errorBody?.error;
    const knownCode: CalendarAdminErrorCode =
      code === "not_connected" || code === "needs_reauth" || code === "google_transient" || code === "insufficient_scope"
        ? code
        : "unknown";
    throw new CalendarAdminError(knownCode);
  }
  return response.json();
}

/** Crea un calendario nuevo en la cuenta de Google conectada (tarea 4.1). No es optimista: el `id` lo asigna Google. */
export function useCreateCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CALENDAR_ADMIN_MUTATION_KEY,
    mutationFn: (name: string) =>
      requestJson<{ calendar: { id: string; summary: string } }>("/api/calendar/calendars", "POST", { name }),
    onSuccess: () => toastSuccess("Calendario creado."),
    onError: reportCalendarAdminError,
    onSettled: () => invalidateGoogleCalendars(queryClient),
  });
}

/** Cambia el nombre de un calendario existente (tarea 4.1). */
export function useRenameCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CALENDAR_ADMIN_MUTATION_KEY,
    mutationFn: ({ calendarId, name }: { calendarId: string; name: string }) =>
      requestJson(`/api/calendar/calendars/${encodeURIComponent(calendarId)}`, "PATCH", { name }),
    onSuccess: () => toastSuccess("Calendario renombrado."),
    onError: reportCalendarAdminError,
    onSettled: () => invalidateGoogleCalendars(queryClient),
  });
}

/** Recolorea un calendario con uno de los colores que admite Google (tarea 4.1/4.3). */
export function useRecolorCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CALENDAR_ADMIN_MUTATION_KEY,
    mutationFn: ({ calendarId, colorId }: { calendarId: string; colorId: string }) =>
      requestJson(`/api/calendar/calendars/${encodeURIComponent(calendarId)}`, "PATCH", { colorId }),
    onSuccess: () => toastSuccess("Color del calendario actualizado."),
    onError: reportCalendarAdminError,
    onSettled: () => invalidateGoogleCalendars(queryClient),
  });
}

/**
 * Elimina un calendario de la cuenta de Google entera (tarea 4.1/4.4). Sin
 * optimistic update a propósito, a diferencia del resto de las mutaciones
 * de la app (`.claude/rules/frontend.md`): esto es destructivo e
 * irreversible desde Trazio, así que se espera la confirmación del
 * servidor antes de sacarlo de la lista, en vez de sacarlo antes y
 * arriesgarse a tener que devolverlo si Google lo rechaza.
 */
export function useDeleteCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: CALENDAR_ADMIN_MUTATION_KEY,
    mutationFn: (calendarId: string) => requestJson(`/api/calendar/calendars/${encodeURIComponent(calendarId)}`, "DELETE"),
    onSuccess: () => toastSuccess("Calendario eliminado de tu cuenta de Google. Esta acción no se puede deshacer."),
    onError: reportCalendarAdminError,
    onSettled: () => invalidateGoogleCalendars(queryClient),
  });
}
