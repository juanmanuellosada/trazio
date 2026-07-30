"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FILTER_COLUMNS, type FilterRow } from "./filter-columns";

/**
 * Caché del filtro puntual de `/filtros/[id]` (bloque 2.14), separado del
 * de la lista (`filtersQueryKey`) — mismo patrón que
 * `tasksQueryKey`/`taskDetailQueryKey` en `lib/tasks/`.
 */
export function filterDetailQueryKey(id: string) {
  return ["filters", "detail", id] as const;
}

export async function fetchFilter(id: string): Promise<FilterRow> {
  const supabase = createClient();
  const { data, error } = await supabase.from("filters").select(FILTER_COLUMNS).eq("id", id).single();
  if (error) throw error;
  return data as FilterRow;
}

export function useFilter(id: string, initialData?: FilterRow) {
  return useQuery({ queryKey: filterDetailQueryKey(id), queryFn: () => fetchFilter(id), initialData });
}
