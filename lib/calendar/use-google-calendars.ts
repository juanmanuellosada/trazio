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
  /** Rol de la cuenta conectada sobre este calendario ("owner", "writer", "reader", "freeBusyReader"). */
  accessRole: string;
};

export type GoogleCalendarColorOption = { id: string; background: string; foreground: string };

/**
 * Puede crear o editar eventos en este calendario: alcanza con "owner" o
 * "writer" (a diferencia de *eliminar* el calendario en sí, que exige
 * específicamente "owner" — `calendars-section.tsx`). "reader" y
 * "freeBusyReader" no alcanzan; Google rechaza la escritura con 403.
 */
export function canWriteCalendar(calendar: { accessRole: string }): boolean {
  return calendar.accessRole === "owner" || calendar.accessRole === "writer";
}

export const googleCalendarsQueryKey = ["calendar-admin", "calendars"] as const;
export const googleCalendarColorsQueryKey = ["calendar-admin", "colors"] as const;

/** Código de error que devuelven las rutas bajo `app/api/calendar/` (tarea 2.7/4.1). */
export type CalendarAdminErrorCode =
  | "not_connected"
  | "needs_reauth"
  | "google_transient"
  | "insufficient_scope"
  | "forbidden_non_owner"
  | "cannot_delete_primary"
  | "unknown";

/**
 * Códigos que representan un estado permanente: reintentar no lo arregla
 * (no hay conexión, o el 4xx es una regla de negocio de Google). TanStack
 * Query reintenta 3 veces por default; para estos códigos, un solo intento
 * alcanza. `needs_reauth` entra en el mismo grupo que `not_connected` e
 * `insufficient_scope`: `getValidAccessToken` (`lib/calendar/connection.ts`)
 * ya evita llamar a Google de nuevo una vez marcada `needs_reauth`, así que
 * reintentar acá tampoco cambiaría nada.
 */
const PERMANENT_ERROR_CODES: readonly CalendarAdminErrorCode[] = ["not_connected", "needs_reauth", "insufficient_scope"];

export class CalendarAdminError extends Error {
  readonly code: CalendarAdminErrorCode;

  constructor(code: CalendarAdminErrorCode) {
    super(code);
    this.name = "CalendarAdminError";
    this.code = code;
  }
}

const KNOWN_ERROR_CODES: readonly CalendarAdminErrorCode[] = [
  "not_connected",
  "needs_reauth",
  "google_transient",
  "insufficient_scope",
  "forbidden_non_owner",
  "cannot_delete_primary",
];

async function parseErrorCode(response: Response): Promise<CalendarAdminErrorCode> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  const code = body?.error;
  return (KNOWN_ERROR_CODES as string[]).includes(code ?? "") ? (code as CalendarAdminErrorCode) : "unknown";
}

/**
 * No conectado NO es un error: es el estado normal de quien todavía no
 * conectó Google (requirement de la sección Calendarios). La ruta devuelve
 * 200 con `connected: false` y las listas vacías en vez de un 404 — antes
 * ensuciaba la consola en toda la app porque `GoogleReconnectBanner` llama a
 * este mismo hook desde `app/(app)/layout.tsx`.
 */
/** Exportado para que `calendar-admin-mutations.ts` tipe el parche optimista de `useUpdateEnabledCalendars` sobre este mismo caché. */
export type GoogleCalendarsData = {
  calendars: GoogleCalendarListItem[];
  enabledCalendarIds: string[];
  connected: boolean;
};

async function fetchGoogleCalendars(): Promise<GoogleCalendarsData> {
  const response = await fetch("/api/calendar/calendars");
  if (!response.ok) throw new CalendarAdminError(await parseErrorCode(response));
  return response.json();
}

/** Calendarios de la cuenta de Google conectada, para listarlos en la sección Calendarios (tarea 4.2). */
export function useGoogleCalendars() {
  return useQuery({
    queryKey: googleCalendarsQueryKey,
    queryFn: fetchGoogleCalendars,
    // Un 4xx de negocio (sin conexión, permiso insuficiente) no mejora
    // reintentándolo: solo agrega ruido (D-antes, cuatro llamados por vez).
    retry: (failureCount, error) => {
      if (error instanceof CalendarAdminError && PERMANENT_ERROR_CODES.includes(error.code)) return false;
      return failureCount < 3;
    },
  });
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
