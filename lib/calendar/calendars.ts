import { createClient } from "@/lib/supabase/server";
import { decryptRefreshToken } from "./crypto";
import { GoogleConnectionNotFoundError } from "./connection";
import { GoogleReauthRequiredError, refreshAccessToken } from "./google-client";
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
 * `calendar_connections` (tarea 4.1), igual que `lib/calendar/connection.ts`
 * hace para OAuth y el listado de calendarios. Vive en un archivo propio en
 * vez de sumarse a `connection.ts` porque este bloque no puede editar ese
 * archivo: hay otro agente trabajando en paralelo sobre eventos que también
 * lo usa.
 *
 * `getValidAccessToken` duplica una porción chica de la lógica de
 * `loadConnection`/`refreshAndHandleReauth` de `connection.ts` en vez de
 * reusarla, porque esas dos funciones no están exportadas y no se puede
 * tocar ese archivo en esta tanda. Si se retoca esta fase más adelante,
 * unificar los dos en un solo helper compartido es la limpieza obvia.
 */

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getValidAccessToken(supabase: SupabaseServerClient, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new GoogleConnectionNotFoundError("Este usuario no tiene una conexión de Google Calendar.");
  }

  const refreshTokenPlain = decryptRefreshToken(data.refresh_token);
  try {
    const { accessToken } = await refreshAccessToken(refreshTokenPlain);
    return accessToken;
  } catch (refreshError) {
    if (refreshError instanceof GoogleReauthRequiredError) {
      const { error: updateError } = await supabase
        .from("calendar_connections")
        .update({ status: "needs_reauth" })
        .eq("user_id", userId);
      if (updateError) throw updateError;
    }
    throw refreshError;
  }
}

/** Crea un calendario nuevo en la cuenta de Google conectada (tarea 4.1). */
export async function createCalendar(userId: string, name: string): Promise<GoogleCalendarCreated> {
  const supabase = await createClient();
  const accessToken = await getValidAccessToken(supabase, userId);
  return createGoogleCalendar(accessToken, name);
}

/** Cambia el nombre de un calendario existente (tarea 4.1). */
export async function renameCalendar(userId: string, calendarId: string, name: string): Promise<void> {
  const supabase = await createClient();
  const accessToken = await getValidAccessToken(supabase, userId);
  await renameGoogleCalendar(accessToken, calendarId, name);
}

/** Colores de calendario que admite Google, para ofrecerlos en el selector (tarea 4.3). */
export async function listCalendarColorOptions(userId: string): Promise<GoogleCalendarColorOption[]> {
  const supabase = await createClient();
  const accessToken = await getValidAccessToken(supabase, userId);
  return listGoogleCalendarColorOptions(accessToken);
}

/** Recolorea un calendario con uno de los colores que admite Google (tarea 4.1/4.3). */
export async function recolorCalendar(userId: string, calendarId: string, colorId: string): Promise<void> {
  const supabase = await createClient();
  const accessToken = await getValidAccessToken(supabase, userId);
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
  const supabase = await createClient();
  const accessToken = await getValidAccessToken(supabase, userId);
  await deleteGoogleCalendar(accessToken, calendarId);
}

export type { GoogleCalendarColorOption, GoogleCalendarCreated };
