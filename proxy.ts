import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renombró `middleware` a `proxy`; ver
// https://nextjs.org/docs/app/api-reference/file-conventions/proxy.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Corre solo en navegaciones reales (documento y la petición RSC que
     * confirma cada click de <Link>), no en cada payload que dispara una
     * pestaña abierta. Excluye, además de los estáticos de siempre:
     * - /api/*: cada ruta bajo app/api crea su propio cliente de Supabase
     *   vía getCurrentUser() (lib/supabase/current-user.ts) y se refresca
     *   sola — a diferencia de un Server Component, un Route Handler sí
     *   puede escribir cookies, así que no depende de que este proxy haya
     *   corrido antes.
     * - manifest.webmanifest y sw.js: assets de PWA sin sesión de por medio.
     * - prefetches de RSC (header `next-router-prefetch`, que pone
     *   Next.js en cada <Link> que entra en viewport): son especulativos,
     *   no una llegada real a la pantalla. La protección de esas rutas no
     *   depende de este proxy — app/(app)/layout.tsx repite el chequeo de
     *   sesión en cada render, prefetch incluido (ver su comentario) — así
     *   que excluirlos del refresco no abre un agujero, solo evita
     *   refrescar la sesión por adelantado para un click que puede no pasar.
     */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
