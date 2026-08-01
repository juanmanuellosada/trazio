import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/**
 * Prefijos de `app/(app)/**`, la app privada (AGENTS.md). El grupo de rutas
 * `(app)` no aparece en la URL, así que se listan los segmentos reales.
 */
const PROTECTED_PREFIXES = [
  "/bandeja",
  "/hoy",
  "/proximos",
  "/proyecto",
  "/tarea",
  "/completado",
  "/etiquetas",
  "/filtros",
  "/buscar",
  "/habitos",
  "/configuracion",
] as const;

/**
 * `/etiquetas` y `/filtros` ya cubren sus rutas de detalle (`/etiquetas/<id>`,
 * `/filtros/<id>`) por el `startsWith` de abajo, así que no hace falta un
 * prefijo aparte para cada una (bloque 8.6, revisión de esta lista ahora que
 * `/proximos`, `/filtros` y `/etiquetas/<id>` existen de verdad). `/buscar`
 * faltaba en la lista: quedaba sin proteger pese a que la ruta ya existe.
 */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refresca la sesión en cada petición y protege `app/(app)/**`. Redirige a
 * login conservando el destino original en `next` para volver ahí después
 * de iniciar sesión.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Con Fluid compute no hay que guardar este cliente en una variable
  // global: se crea uno nuevo en cada petición.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // No poner código entre createServerClient y getClaims(): un error acá
  // puede desloguear gente al azar y es muy difícil de diagnosticar.
  //
  // IMPORTANTE: sacar este llamado rompe el refresh de sesión con SSR.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname, search } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    const redirectResponse = NextResponse.redirect(url);
    // No devolver este redirect solo: hay que copiarle las cookies de
    // `supabaseResponse`, si no el navegador y el servidor se desincronizan
    // (mismo comentario de arriba, en el caso en que no hace falta redirect).
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  // Hay que devolver supabaseResponse tal cual. Si se arma una respuesta
  // nueva hay que copiarle las cookies; si no, el navegador y el servidor
  // se desincronizan y la sesión se corta antes de tiempo.
  return supabaseResponse;
}
