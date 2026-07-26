import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route
 * Handlers. Usa la clave publicable: nunca la `service_role`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // El `setAll` se llamó desde un Server Component, que no puede
            // escribir cookies. Se ignora porque el proxy (lib/supabase/proxy.ts)
            // refresca la sesión en cada petición.
          }
        },
      },
    },
  );
}
