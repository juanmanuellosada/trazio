import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-path";
import { getSiteUrl } from "@/lib/site-url";
import { resolveEntryPath } from "@/lib/preferences/get-default-view-path";

/**
 * Ruta compartida por dos flujos que Supabase resuelve igual, con un
 * `code` de PKCE para intercambiar por sesión: el login con Google (tarea
 * 4.7) y el enlace de recuperación de contraseña (tarea 4.15), que llega
 * acá con `next=/restablecer-contrasena` en vez de un parámetro de token
 * que se lea directamente.
 */
const RESET_PASSWORD_PATH = "/restablecer-contrasena";

/**
 * Intercambia el código de OAuth o de recuperación por una sesión y
 * redirige. La URL de redirect se resuelve en tiempo de ejecución con
 * `getSiteUrl()` para que funcione igual en producción y en cada preview
 * de Vercel.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const siteUrl = getSiteUrl();

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const redirectTo = data.user ? await resolveEntryPath(data.user.id, next) : next;
      return NextResponse.redirect(`${siteUrl}${redirectTo}`);
    }

    // El código de recuperación venció o ya se usó: se vuelve a la pantalla
    // de reset con su propio error, no con el de Google, porque nadie
    // intentó entrar con OAuth acá.
    if (next.startsWith(RESET_PASSWORD_PATH)) {
      return NextResponse.redirect(`${siteUrl}${RESET_PASSWORD_PATH}?error=token`);
    }
  }

  // Sin código o código inválido: no hay sesión que armar. Se vuelve a
  // login con una marca de error para que la pantalla muestre el mensaje
  // de tres partes de `.claude/rules/copy.md`.
  return NextResponse.redirect(`${siteUrl}/login?error=oauth`);
}
