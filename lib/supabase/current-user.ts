import { createClient } from "./server";

export type CurrentUser = { id: string; email: string | null };

/**
 * Resuelve el usuario autenticado a partir de los claims del JWT, igual que
 * `lib/supabase/proxy.ts`: verificación local, sin round-trip de red al
 * servidor de Auth. Devuelve `null` si no hay sesión.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims?.sub) {
    return null;
  }

  return { id: claims.sub, email: (claims.email as string | undefined) ?? null };
}
