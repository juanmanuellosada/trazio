"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastError, toastSuccess } from "@/lib/toast";

/**
 * Aplicaciones conectadas (bloque 5.6 de `servidor-mcp`, spec `configuracion`
 * "Aplicaciones conectadas"): a diferencia de `lib/calendar/`, estos datos
 * salen directo del servidor OAuth 2.1 de Supabase con `supabase-js`
 * (`auth.oauth.listGrants`/`revokeGrant`), no de una ruta propia bajo
 * `app/api/` — no hay ningún token de terceros que solo el servidor tenga,
 * es la sesión del propio usuario.
 *
 * Forma real verificada contra el stack local (no la de `auth-js/types.d.ts`,
 * que declara `client.uri`/`client.logo_uri` como si siempre vinieran): el
 * servidor solo devuelve `client.id` y `client.name`. La interfaz no muestra
 * uri/logo porque en la práctica no llegan.
 */

export type ConnectedApp = {
  clientId: string;
  name: string;
  grantedAt: string;
};

export const connectedAppsQueryKey = ["oauth", "connected-apps"] as const;

async function fetchConnectedApps(): Promise<ConnectedApp[]> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.oauth.listGrants();
  if (error) throw error;
  return data.map((grant) => ({
    clientId: grant.client.id,
    name: grant.client.name,
    grantedAt: grant.granted_at,
  }));
}

/** Aplicaciones que el usuario autorizó por MCP, para listarlas en la sección "Aplicaciones conectadas". */
export function useConnectedApps() {
  return useQuery({ queryKey: connectedAppsQueryKey, queryFn: fetchConnectedApps });
}

function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /fetch|network/i.test(message);
}

/** Corta el acceso de una aplicación conectada (tarea 5.6, requirement "revocar cada uno individualmente"). No borra datos de la cuenta, solo el acceso — sin diálogo de confirmación destructivo. */
export function useRevokeConnectedApp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) => {
      const supabase = createClient();
      const { error } = await supabase.auth.oauth.revokeGrant({ clientId });
      if (error) throw error;
    },
    onSuccess: () => toastSuccess("Le cortaste el acceso a la aplicación."),
    onError: (error) =>
      toastError(
        "No pudimos cortar el acceso",
        isNetworkError(error) ? "se cortó la conexión" : "algo falló de nuestro lado",
        "Volvé a intentar en un momento.",
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: connectedAppsQueryKey }),
  });
}
