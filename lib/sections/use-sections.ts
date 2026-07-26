"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/** Fila de sección (bloque 6.8), sin `select('*')`. */
export type SectionRow = {
  id: string;
  project_id: string;
  name: string;
  position: number;
  is_collapsed: boolean;
};

const SECTION_COLUMNS = "id, project_id, name, position, is_collapsed";

export function sectionsQueryKey(projectId: string) {
  return ["sections", projectId] as const;
}

export async function fetchSections(projectId: string): Promise<SectionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sections")
    .select(SECTION_COLUMNS)
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SectionRow[];
}

/** Secciones de un proyecto. `initialData` siembra el caché con lo que ya trajo el Server Component de la página de proyecto. */
export function useSections(projectId: string, initialData?: SectionRow[]) {
  return useQuery({
    queryKey: sectionsQueryKey(projectId),
    queryFn: () => fetchSections(projectId),
    initialData,
  });
}
