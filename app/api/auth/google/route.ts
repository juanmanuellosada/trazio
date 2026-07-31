import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { buildAuthorizationUrl, generateOAuthState } from "@/lib/calendar/google-client";
import { setOAuthStateCookie } from "@/lib/calendar/oauth-state";

/**
 * Arranca el flujo de conexión con Google Calendar (tarea 2.1). El `state`
 * es la defensa contra CSRF (tarea 2.3): se genera acá con aleatoriedad
 * criptográfica, se guarda en una cookie httpOnly de este dominio, y
 * `callback/route.ts` lo compara con el que vuelve en la URL antes de
 * canjear el código. Si no coincide, se rechaza sin llamar a Google.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/bandeja", request.url));
  }

  let authorizationUrl: string;
  try {
    const state = generateOAuthState();
    await setOAuthStateCookie(state);
    authorizationUrl = buildAuthorizationUrl(state);
  } catch {
    // GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI todavía no están cargadas
    // (docs/setup-google-calendar.md, tarea 0.2 del dueño del proyecto): se
    // avisa con un estado razonable en vez de romper con un 500 crudo.
    return NextResponse.redirect(new URL("/bandeja?calendario=error&motivo=no_configurado", request.url));
  }

  return NextResponse.redirect(authorizationUrl);
}
