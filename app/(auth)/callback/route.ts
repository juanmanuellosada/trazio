import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

/**
 * Evita el open redirect: solo se acepta un destino interno (`/algo`), nunca
 * una URL absoluta ni un `//` que el navegador interprete como protocolo
 * relativo.
 */
function safeNextPath(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/bandeja";
}

/**
 * Intercambia el código de OAuth por una sesión y redirige. La URL de
 * redirect se resuelve en tiempo de ejecución con `getSiteUrl()` para que
 * funcione igual en producción y en cada preview de Vercel.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const siteUrl = getSiteUrl();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${siteUrl}${next}`);
    }
  }

  // Sin código o código inválido: no hay sesión que armar. Se vuelve a
  // login con una marca de error para que la pantalla muestre el mensaje
  // de tres partes de `.claude/rules/copy.md`.
  return NextResponse.redirect(`${siteUrl}/login?error=oauth`);
}
