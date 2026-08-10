import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente de Supabase para el servidor MCP (Ola 6, D-A de `design.md`):
 * mismo criterio que `lib/supabase/server.ts`, pero con el access token del
 * `Authorization: Bearer` del pedido MCP en vez de cookies — acá no hay
 * sesión de navegador. Nunca la `service_role`: cada llamada corre bajo el
 * token del usuario que autorizó la conexión, con las mismas políticas de
 * RLS que la sesión normal de la app (spec `mcp`, requirement "Toda
 * herramienta del MCP opera bajo el token OAuth del usuario conectado").
 */
export function createMcpSupabaseClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
}
