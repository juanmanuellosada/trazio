"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/** Fila de sección (bloque 6.8), sin `select('*')`. */
export type SectionRow = {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  position: number;
  is_collapsed: boolean;
};

const SECTION_COLUMNS = "id, project_id, name, description, position, is_collapsed";

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

export const allSectionsQueryKey = ["sections", "all"] as const;

export async function fetchAllSections(): Promise<SectionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sections")
    .select(SECTION_COLUMNS)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SectionRow[];
}

/**
 * Todas las secciones del usuario, de todos sus proyectos (bloque `fila-de-
 * tarea-en-niveles`, D-D): la fuente del nombre de sección para las vistas
 * que cruzan proyectos (Hoy, Próximos, Etiqueta, Filtro, Buscador,
 * Completado), donde `useSections(projectId)` no sirve — no hay un único
 * proyecto del cual pedirlas. `initialData` siembra el caché con lo que ya
 * trajo `getAllSections` desde el layout, igual que `useProjects`.
 */
export function useAllSections(initialData?: SectionRow[]) {
  return useQuery({
    queryKey: allSectionsQueryKey,
    queryFn: fetchAllSections,
    initialData,
  });
}
