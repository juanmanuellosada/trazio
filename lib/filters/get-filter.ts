import { createClient } from "@/lib/supabase/server";
import { FILTER_COLUMNS, type FilterRow } from "./filter-columns";

/**
 * Un filtro puntual, para sembrar el caché de `useFilter` desde el Server
 * Component de `/filtros/[id]` (bloque 2.14). `null` si no existe o no es
 * del usuario — la RLS de `filters` ya lo garantiza, esto solo evita el
 * error de `.single()` sobre cero filas.
 */
export async function getFilter(id: string, userId: string): Promise<FilterRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("filters").select(FILTER_COLUMNS).eq("id", id).eq("user_id", userId).maybeSingle();

  return (data as FilterRow | null) ?? null;
}
