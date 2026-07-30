"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { FILTER_COLUMNS, type FilterRow } from "./filter-columns";

export type { FilterRow } from "./filter-columns";

export const filtersQueryKey = ["filters"] as const;

/** Todos los filtros del usuario, para la lista de `/filtros` y para el panel lateral (favoritos + lista colapsable). */
export async function fetchFilters(): Promise<FilterRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("filters").select(FILTER_COLUMNS).order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FilterRow[];
}

export function useFilters(initialData?: FilterRow[]) {
  return useQuery({ queryKey: filtersQueryKey, queryFn: fetchFilters, initialData });
}
