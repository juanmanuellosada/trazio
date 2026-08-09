import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { loginRedirectPath } from "@/lib/supabase/login-redirect-path";
import { combineSharedContent } from "@/lib/share-target/combine";

/**
 * `share_target.action` del manifest (`app/manifest.ts`): a donde el sistema
 * manda el `GET` cuando se comparte texto, un título o un enlace a Trazio
 * (D-B del design de `accesos-directos-y-compartir`, sin recepción de
 * archivos — no-goal). No crea nada acá (D-A): arma el texto con
 * `combineSharedContent` y redirige a la Bandeja con el parámetro
 * `compartido` (y `descripcion` si sobró algo), que `ShortcutProvider` lee
 * al montar para abrir el alta rápida ya con ese texto puesto — mismo
 * diálogo que abre el atajo `Q`, misma confirmación manual.
 *
 * Sin sesión, el destino se conserva en `next` (mismo patrón que
 * `app/entrar/route.ts`) para no perder lo compartido al loguearse.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { text, description } = combineSharedContent({
    title: searchParams.get("title"),
    text: searchParams.get("text"),
    url: searchParams.get("url"),
  });

  const targetParams = new URLSearchParams({ compartido: text });
  if (description) targetParams.set("descripcion", description);
  const target = `/bandeja?${targetParams.toString()}`;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL(loginRedirectPath(target), request.url));
  }

  return NextResponse.redirect(new URL(target, request.url));
}
