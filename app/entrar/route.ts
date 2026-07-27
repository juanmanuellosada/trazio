import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { resolveEntryPath } from "@/lib/preferences/get-default-view-path";

/**
 * `start_url` de la PWA instalada (`app/manifest.ts`). No es una pantalla en
 * sí misma: entra sin pedir un destino puntual, así que resuelve a dónde ir
 * en vez de mostrar algo propio. Logueado, respeta
 * `user_preferences.default_view` con el mismo `resolveEntryPath` que usa el
 * login (bloque 11.5/11.7) pasándole el *fallback* genérico como `next`, que
 * es justo lo que dispara la resolución por preferencia. Sin sesión, manda a
 * login conservando `next=/bandeja`, así que la preferencia se aplica en
 * cuanto la persona inicia sesión.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/bandeja", request.url));
  }

  const redirectTo = await resolveEntryPath(user.id, "/bandeja");
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
