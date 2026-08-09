import { createClient } from "@/lib/supabase/server";
import { seedExampleContentIfNeeded } from "@/lib/onboarding/seed-example-content";

const GENERIC_FALLBACK = "/bandeja";

/** Mapea `default_view` (B4, ampliado en fase 2 con `proximos`) a la ruta real. Cualquier valor inesperado cae a Bandeja. */
export function pathForDefaultView(defaultView: string | null | undefined): string {
  if (defaultView === "hoy") return "/hoy";
  if (defaultView === "proximos") return "/proximos";
  return "/bandeja";
}

/**
 * A dónde entra alguien que acaba de iniciar sesión (requirement "Pantalla
 * por defecto al entrar", tarea 11.5/11.7). Si `next` pide un destino
 * puntual (un enlace directo a una tarea, por ejemplo) se respeta tal
 * cual — la preferencia solo decide el destino genérico de "entré sin
 * pedir nada en particular", que es cuando `next` es el fallback de
 * `lib/safe-path.ts`.
 *
 * Este es el único punto de entrada que comparten los tres caminos de login
 * (`app/entrar/route.ts`, la Server Action de `app/(auth)/login/`, y el
 * callback de OAuth/recuperación en `app/(auth)/callback/`), así que acá se
 * dispara el sembrado del contenido de ejemplo
 * (`openspec/changes/onboarding-con-ejemplos`, D-F): corre incondicionalmente,
 * antes de resolver `next`, para que también alcance a una entrada con un
 * destino puntual y no solo a la genérica. `seedExampleContentIfNeeded` nunca
 * tira y es barata para una cuenta ya sembrada (un solo `update` que no
 * encuentra fila), así que no hay motivo para saltearla en ningún camino.
 */
export async function resolveEntryPath(userId: string, next: string): Promise<string> {
  const supabase = await createClient();
  await seedExampleContentIfNeeded(supabase, userId);

  if (next !== GENERIC_FALLBACK) return next;

  const { data } = await supabase
    .from("user_preferences")
    .select("default_view")
    .eq("user_id", userId)
    .single();

  return pathForDefaultView(data?.default_view);
}
