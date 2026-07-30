import { createClient } from "@/lib/supabase/server";
import { FILTER_COLUMNS, type FilterRow } from "./filter-columns";

/**
 * Todos los filtros del usuario, para sembrar desde el Server Component de
 * `/filtros` el mismo caché que usa `useFilters` en el cliente — mismo
 * patrón que `getLabels`/`getAllProjects`.
 */
export async function getFilters(userId: string): Promise<FilterRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("filters")
    .select(FILTER_COLUMNS)
    .eq("user_id", userId)
    .order("name", { ascending: true });

  return (data ?? []) as FilterRow[];
}
