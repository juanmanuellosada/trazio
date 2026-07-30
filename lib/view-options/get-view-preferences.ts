import { createClient } from "@/lib/supabase/server";
import { parseViewOptions, type ViewOptions } from "./schema";

/**
 * Opciones de vista de una pantalla (bloque 6.2), para sembrar el caché de
 * `useViewPreferences` desde el Server Component de cada página — mismo
 * patrón que `getUserPreferences`. Sin fila para esa `view_key` (usuario
 * nuevo, o pantalla nunca configurada), `data` es `null` y
 * `parseViewOptions` devuelve los defaults de esa pantalla.
 */
export async function getViewPreferences(userId: string, viewKey: string): Promise<ViewOptions> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("view_preferences")
    .select("options")
    .eq("user_id", userId)
    .eq("view_key", viewKey)
    .maybeSingle();

  return parseViewOptions(viewKey, data?.options ?? null);
}
