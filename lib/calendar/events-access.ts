import { createClient } from "@/lib/supabase/server";
import { decryptRefreshToken } from "./crypto";
import { GoogleReauthRequiredError, refreshAccessToken } from "./google-client";

/**
 * Resuelve un access token vigente y los calendarios habilitados de un
 * usuario, para las llamadas de `lib/calendar/events.ts` (tarea 3.1).
 *
 * Esto es, a propósito, una miniatura de `refreshAndHandleReauth` +
 * `loadConnection` de `lib/calendar/connection.ts` — pero esas dos funciones
 * no están exportadas ahí, y `connection.ts` es un archivo bloqueado en esta
 * tanda (otro agente trabaja en paralelo con la administración de
 * calendarios sobre `google-client.ts`/`connection.ts`/`crypto.ts`). No se
 * pudo evitar la duplicación sin editar un archivo prohibido. Ver el informe
 * final del agente: lo ideal a futuro es que `connection.ts` exporte una
 * función equivalente y este módulo la use en vez de repetirla.
 */

export type ConnectionState =
  | { kind: "not_connected" }
  | { kind: "needs_reauth" }
  | { kind: "ready"; accessToken: string; enabledCalendarIds: string[] };

export async function resolveAccessToken(userId: string): Promise<ConnectionState> {
  const supabase = await createClient();
  const { data: connection, error } = await supabase
    .from("calendar_connections")
    .select("refresh_token, enabled_calendar_ids, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!connection) return { kind: "not_connected" };
  if (connection.status === "needs_reauth") return { kind: "needs_reauth" };

  const refreshTokenPlain = decryptRefreshToken(connection.refresh_token);
  try {
    const { accessToken } = await refreshAccessToken(refreshTokenPlain);
    return { kind: "ready", accessToken, enabledCalendarIds: connection.enabled_calendar_ids ?? [] };
  } catch (error) {
    if (error instanceof GoogleReauthRequiredError) {
      const { error: updateError } = await supabase
        .from("calendar_connections")
        .update({ status: "needs_reauth" })
        .eq("user_id", userId);
      if (updateError) throw updateError;
      return { kind: "needs_reauth" };
    }
    // GoogleTransientError u otra falla: no dice nada sobre la conexión, se propaga tal cual.
    throw error;
  }
}
