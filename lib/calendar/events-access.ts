import { GoogleConnectionNotFoundError, getValidAccessToken } from "./connection";
import { GoogleReauthRequiredError } from "./google-client";

/**
 * Resuelve un access token vigente y los calendarios habilitados de un
 * usuario, para las llamadas de `lib/calendar/events.ts` (tarea 3.1).
 *
 * Envuelve `getValidAccessToken` de `lib/calendar/connection.ts` —que lanza
 * errores tipados, pensada para las rutas de administración— y convierte
 * esos throws al estado `ConnectionState`: acá "no hay conexión" o "hay que
 * reautorizar" son datos para degradar la vista, no excepciones.
 */

export type ConnectionState =
  | { kind: "not_connected" }
  | { kind: "needs_reauth" }
  | { kind: "ready"; accessToken: string; enabledCalendarIds: string[] };

export async function resolveAccessToken(userId: string): Promise<ConnectionState> {
  try {
    const { accessToken, enabledCalendarIds } = await getValidAccessToken(userId);
    return { kind: "ready", accessToken, enabledCalendarIds };
  } catch (error) {
    if (error instanceof GoogleConnectionNotFoundError) return { kind: "not_connected" };
    if (error instanceof GoogleReauthRequiredError) return { kind: "needs_reauth" };
    // GoogleTransientError u otra falla: no dice nada sobre la conexión, se propaga tal cual.
    throw error;
  }
}
