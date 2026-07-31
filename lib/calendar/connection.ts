import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { decryptRefreshToken, encryptRefreshToken } from "./crypto";
import {
  GoogleAccessTokenExpiredError,
  GoogleReauthRequiredError,
  listCalendars,
  refreshAccessToken,
  type GoogleCalendarSummary,
  type GoogleTokens,
} from "./google-client";

/**
 * Orquesta `lib/calendar/google-client.ts` (habla con Google) con
 * `calendar_connections` (lo que se guarda). El cliente no sabe de Supabase
 * a propósito, para poder testearlo con la API simulada sin una base atrás
 * (tarea 2.8); este módulo es el que sí conoce la tabla y por eso no tiene
 * el mismo nivel de tests unitarios — se verifica con `pnpm test:rls` y a
 * mano, como el resto del código que toca la base en este proyecto.
 */

export class GoogleMissingRefreshTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleMissingRefreshTokenError";
  }
}

export class GoogleConnectionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleConnectionNotFoundError";
  }
}

/** Válido tanto para el alta inicial como para reconectar una cuenta ya conocida. */
export const enabledCalendarIdsSchema = z.array(z.string().min(1)).max(50);

type ConnectionRow = {
  refresh_token: string;
  enabled_calendar_ids: string[] | null;
  status: string;
};

export type ConnectionUpdateDecision =
  | { action: "save"; refreshToken: string }
  | { action: "keep-existing-refresh-token" }
  | { action: "reject-missing-refresh-token" };

/**
 * Decide qué hacer con el resultado del intercambio de código, sin tocar la
 * base: función pura, testeada aparte. El caso interesante es cuando Google
 * no manda `refresh_token` (tarea 2.8, "una respuesta sin refresh_token"):
 * si ya había una conexión, se conserva el refresh token que tenía —seguir
 * pudiendo refrescar es mejor que borrar una conexión que andaba—; si es la
 * primera vez, no hay nada que conservar y hay que avisar.
 */
export function decideConnectionUpdate(tokens: GoogleTokens, hasExistingConnection: boolean): ConnectionUpdateDecision {
  if (tokens.refreshToken) {
    return { action: "save", refreshToken: tokens.refreshToken };
  }
  if (hasExistingConnection) {
    return { action: "keep-existing-refresh-token" };
  }
  return { action: "reject-missing-refresh-token" };
}

async function loadConnection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("refresh_token, enabled_calendar_ids, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Guarda la conexión a partir del resultado del intercambio de código (tarea 2.2). */
export async function saveConnectionFromExchange(userId: string, tokens: GoogleTokens): Promise<void> {
  const supabase = await createClient();
  const existing = await loadConnection(supabase, userId);
  const decision = decideConnectionUpdate(tokens, existing !== null);

  if (decision.action === "reject-missing-refresh-token") {
    throw new GoogleMissingRefreshTokenError(
      "Google no devolvió un refresh token en la primera autorización.",
    );
  }

  const refreshTokenToStore =
    decision.action === "save" ? encryptRefreshToken(decision.refreshToken) : existing!.refresh_token;

  const { error } = await supabase
    .from("calendar_connections")
    .upsert({ user_id: userId, refresh_token: refreshTokenToStore, status: "active" });
  if (error) throw error;
}

/** Desconecta la cuenta (tarea 2.6): borra únicamente la conexión, nunca datos de Trazio. */
export async function disconnectConnection(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("calendar_connections").delete().eq("user_id", userId);
  if (error) throw error;
}

/**
 * Refresca el access token y marca la conexión como `needs_reauth` si el
 * refresh token ya no sirve (tarea 2.5). Una falla transitoria
 * (`GoogleTransientError`) se propaga sin tocar `status`: no es un problema
 * de la conexión.
 */
async function refreshAndHandleReauth(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  refreshTokenPlain: string,
): Promise<{ accessToken: string }> {
  try {
    return await refreshAccessToken(refreshTokenPlain);
  } catch (error) {
    if (error instanceof GoogleReauthRequiredError) {
      const { error: updateError } = await supabase
        .from("calendar_connections")
        .update({ status: "needs_reauth" })
        .eq("user_id", userId);
      if (updateError) throw updateError;
    }
    throw error;
  }
}

/**
 * Devuelve un access token vigente para el usuario junto con los
 * calendarios que tiene habilitados, refrescando contra Google si hace
 * falta (tarea 2.5). Si no hay conexión, lanza `GoogleConnectionNotFoundError`;
 * si el refresh token ya no sirve, lanza `GoogleReauthRequiredError` —sin
 * llamar a Google si la conexión ya estaba marcada `needs_reauth` de antes,
 * porque un refresh token ya sabido inválido no va a empezar a andar—. Una
 * falla transitoria de Google se propaga tal cual.
 *
 * La usa `listUserCalendars` acá mismo, `lib/calendar/calendars.ts` (ABM de
 * calendarios) y `lib/calendar/events-access.ts`, que envuelve estos throws
 * en el estado `ConnectionState` que necesita `events.ts`.
 */
export async function getValidAccessToken(
  userId: string,
): Promise<{ accessToken: string; enabledCalendarIds: string[] }> {
  const supabase = await createClient();
  const connection = await loadConnection(supabase, userId);
  if (!connection) {
    throw new GoogleConnectionNotFoundError("Este usuario no tiene una conexión de Google Calendar.");
  }
  if (connection.status === "needs_reauth") {
    throw new GoogleReauthRequiredError("La conexión de Google Calendar necesita reautorización.");
  }

  const refreshTokenPlain = decryptRefreshToken(connection.refresh_token);
  const enabledCalendarIds = connection.enabled_calendar_ids ?? [];
  const { accessToken } = await refreshAndHandleReauth(supabase, userId, refreshTokenPlain);
  return { accessToken, enabledCalendarIds };
}

/** Lista los calendarios de Google del usuario junto con los que ya tiene habilitados (tarea 2.7). */
export async function listUserCalendars(
  userId: string,
): Promise<{ calendars: GoogleCalendarSummary[]; enabledCalendarIds: string[] }> {
  const { accessToken, enabledCalendarIds } = await getValidAccessToken(userId);

  try {
    const calendars = await listCalendars(accessToken);
    return { calendars, enabledCalendarIds };
  } catch (error) {
    if (!(error instanceof GoogleAccessTokenExpiredError)) throw error;
    // Poco común —recién se pidió un access token nuevo—, pero si Google lo
    // rechaza igual, un único reintento con un refresh nuevo alcanza.
    const retried = await getValidAccessToken(userId);
    const calendars = await listCalendars(retried.accessToken);
    return { calendars, enabledCalendarIds: retried.enabledCalendarIds };
  }
}

/** Guarda qué calendarios de Google se muestran en Trazio (tarea 2.7). */
export async function updateEnabledCalendars(userId: string, calendarIds: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_connections")
    .update({ enabled_calendar_ids: calendarIds })
    .eq("user_id", userId);
  if (error) throw error;
}
