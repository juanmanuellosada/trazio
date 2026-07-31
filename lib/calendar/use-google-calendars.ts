"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Lecturas de la administración de calendarios (tarea 4.1/4.3): a
 * diferencia del resto de la app, estos datos no salen de Supabase —salen
 * de Google a través de nuestras propias rutas bajo `app/api/calendar/`,
 * porque solo el servidor tiene el refresh token para hablar con Google
 * (`lib/calendar/calendars.ts`). Es el primer lugar de Trazio que consume
 * su propia API con TanStack Query en vez de ir directo a `supabase-js`.
 */

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  backgroundColor: string | null;
  primary: boolean;
};

export type GoogleCalendarColorOption = { id: string; background: string; foreground: string };

export const googleCalendarsQueryKey = ["calendar-admin", "calendars"] as const;
export const googleCalendarColorsQueryKey = ["calendar-admin", "colors"] as const;

/** Código de error que devuelven las rutas bajo `app/api/calendar/` (tarea 2.7/4.1). */
export type CalendarAdminErrorCode = "not_connected" | "needs_reauth" | "google_transient" | "insufficient_scope" | "unknown";

export class CalendarAdminError extends Error {
  readonly code: CalendarAdminErrorCode;

  constructor(code: CalendarAdminErrorCode) {
    super(code);
    this.name = "CalendarAdminError";
    this.code = code;
  }
}

async function parseErrorCode(response: Response): Promise<CalendarAdminErrorCode> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  const code = body?.error;
  if (code === "not_connected" || code === "needs_reauth" || code === "google_transient" || code === "insufficient_scope") {
    return code;
  }
  return "unknown";
}

async function fetchGoogleCalendars(): Promise<{ calendars: GoogleCalendarListItem[]; enabledCalendarIds: string[] }> {
  const response = await fetch("/api/calendar/calendars");
  if (!response.ok) throw new CalendarAdminError(await parseErrorCode(response));
  return response.json();
}

/** Calendarios de la cuenta de Google conectada, para listarlos en la sección Calendarios (tarea 4.2). */
export function useGoogleCalendars() {
  return useQuery({ queryKey: googleCalendarsQueryKey, queryFn: fetchGoogleCalendars });
}

async function fetchCalendarColorOptions(): Promise<GoogleCalendarColorOption[]> {
  const response = await fetch("/api/calendar/calendars/colors");
  if (!response.ok) throw new CalendarAdminError(await parseErrorCode(response));
  const body = (await response.json()) as { colors: GoogleCalendarColorOption[] };
  return body.colors;
}

/** Colores que admite Google para calendarios, para el selector de "Recolorear" (tarea 4.3). Solo se pide al abrir ese selector. */
export function useCalendarColorOptions(enabled: boolean) {
  return useQuery({ queryKey: googleCalendarColorsQueryKey, queryFn: fetchCalendarColorOptions, enabled });
}
