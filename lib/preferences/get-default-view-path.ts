import { createClient } from "@/lib/supabase/server";

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
 */
export async function resolveEntryPath(userId: string, next: string): Promise<string> {
  if (next !== GENERIC_FALLBACK) return next;

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_preferences")
    .select("default_view")
    .eq("user_id", userId)
    .single();

  return pathForDefaultView(data?.default_view);
}
