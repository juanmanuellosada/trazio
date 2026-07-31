import { getValidAccessToken } from "./connection";
import {
  createCalendar as createGoogleCalendar,
  deleteCalendar as deleteGoogleCalendar,
  listCalendarColorOptions as listGoogleCalendarColorOptions,
  recolorCalendar as recolorGoogleCalendar,
  renameCalendar as renameGoogleCalendar,
  type GoogleCalendarColorOption,
  type GoogleCalendarCreated,
} from "./google-calendars-client";

/**
 * Orquesta `lib/calendar/google-calendars-client.ts` (habla con Google) con
 * `calendar_connections` (tarea 4.1), usando `getValidAccessToken` de
 * `lib/calendar/connection.ts` para resolver el access token — la misma
 * lógica de refresh y `needs_reauth` que usan el listado de calendarios y
 * los eventos.
 */

/** Crea un calendario nuevo en la cuenta de Google conectada (tarea 4.1). */
export async function createCalendar(userId: string, name: string): Promise<GoogleCalendarCreated> {
  const { accessToken } = await getValidAccessToken(userId);
  return createGoogleCalendar(accessToken, name);
}

/** Cambia el nombre de un calendario existente (tarea 4.1). */
export async function renameCalendar(userId: string, calendarId: string, name: string): Promise<void> {
  const { accessToken } = await getValidAccessToken(userId);
  await renameGoogleCalendar(accessToken, calendarId, name);
}

/** Colores de calendario que admite Google, para ofrecerlos en el selector (tarea 4.3). */
export async function listCalendarColorOptions(userId: string): Promise<GoogleCalendarColorOption[]> {
  const { accessToken } = await getValidAccessToken(userId);
  return listGoogleCalendarColorOptions(accessToken);
}

/** Recolorea un calendario con uno de los colores que admite Google (tarea 4.1/4.3). */
export async function recolorCalendar(userId: string, calendarId: string, colorId: string): Promise<void> {
  const { accessToken } = await getValidAccessToken(userId);
  await recolorGoogleCalendar(accessToken, calendarId, colorId);
}

/**
 * Elimina un calendario de la cuenta de Google entera (tarea 4.1/4.4): no
 * es "ocultarlo de Trazio", es `calendars.delete` de la API de Google, que
 * borra el calendario y sus eventos de la cuenta completa. La confirmación
 * explícita que exige esto vive en
 * `components/settings/calendars-section.tsx`; a esta función nunca se
 * llega sin haberla mostrado.
 */
export async function deleteCalendar(userId: string, calendarId: string): Promise<void> {
  const { accessToken } = await getValidAccessToken(userId);
  await deleteGoogleCalendar(accessToken, calendarId);
}

export type { GoogleCalendarColorOption, GoogleCalendarCreated };
