import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Cliente sin cookies ni sesión, exclusivo de la vista pública de un enlace
 * de lectura (`enlace-de-lectura-de-un-proyecto`, D-F). A diferencia de
 * `client.ts` (navegador) y `server.ts` (Server Components, que sí leen la
 * sesión de las cookies), este nunca la lee: cada pedido pega al backend
 * como el rol `anon`, sea quien sea que esté mirando — incluida una cuenta
 * propia logueada que abrió el enlace de otra persona. Es justamente lo que
 * hace que "alguien logueado ve lo mismo que un anónimo" (D-F) sea cierto
 * por construcción, no por disciplina: no hay sesión que "no usar a
 * propósito", directamente no se crea el cliente que podría tenerla.
 *
 * `get_shared_project` (20260809030000_get_shared_project.sql) está
 * otorgada únicamente al rol `anon`: si este cliente cargara la sesión de
 * quien mira, PostgREST llamaría con el rol `authenticated` y la función
 * rechazaría la ejecución (tarea 2.5).
 */
export function createAnonClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
