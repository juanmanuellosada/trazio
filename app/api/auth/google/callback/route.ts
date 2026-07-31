import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getSiteUrl } from "@/lib/site-url";
import { consumeOAuthStateCookie } from "@/lib/calendar/oauth-state";
import { GoogleReauthRequiredError, GoogleTransientError, exchangeAuthorizationCode } from "@/lib/calendar/google-client";
import { GoogleMissingRefreshTokenError, saveConnectionFromExchange } from "@/lib/calendar/connection";

/**
 * Vuelta del consentimiento de Google (tarea 2.2). Antes de canjear nada se
 * verifica `state` contra la cookie que puso `../route.ts` (tarea 2.3): sin
 * coincidencia exacta, se rechaza sin llamar a Google — es la defensa contra
 * que alguien fuerce a la víctima a conectar la cuenta del atacante.
 *
 * No probado contra Google real (faltan las credenciales de la tarea 0.2):
 * el intercambio de código está cubierto por `lib/calendar/google-client.test.ts`
 * con la API simulada, pero este handler en sí solo se puede ejercitar de
 * punta a punta cuando exista una cuenta real para completar el consentimiento.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const siteUrl = getSiteUrl();

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${siteUrl}/login?next=/bandeja`);
  }

  const expectedState = await consumeOAuthStateCookie();
  const receivedState = searchParams.get("state");
  if (!expectedState || !receivedState || receivedState !== expectedState) {
    return NextResponse.redirect(`${siteUrl}/bandeja?calendario=error&motivo=state`);
  }

  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${siteUrl}/bandeja?calendario=error&motivo=sin_codigo`);
  }

  try {
    const tokens = await exchangeAuthorizationCode(code);
    await saveConnectionFromExchange(user.id, tokens);
  } catch (error) {
    if (error instanceof GoogleMissingRefreshTokenError) {
      return NextResponse.redirect(`${siteUrl}/bandeja?calendario=error&motivo=sin_refresh_token`);
    }
    if (error instanceof GoogleReauthRequiredError) {
      return NextResponse.redirect(`${siteUrl}/bandeja?calendario=error&motivo=codigo_invalido`);
    }
    if (error instanceof GoogleTransientError) {
      return NextResponse.redirect(`${siteUrl}/bandeja?calendario=error&motivo=google_caido`);
    }
    return NextResponse.redirect(`${siteUrl}/bandeja?calendario=error&motivo=desconocido`);
  }

  return NextResponse.redirect(`${siteUrl}/bandeja?calendario=conectado`);
}
