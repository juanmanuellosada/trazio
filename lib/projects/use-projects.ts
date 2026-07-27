"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Fila de proyecto usada por toda la capa interactiva del bloque 6 (árbol
 * del panel lateral y vista de proyecto). Sin `select('*')`: solo las
 * columnas que la interfaz realmente usa (`.claude/rules/database.md`).
 */
export type ProjectRow = {
  id: string;
  name: string;
  // `string`, no `ProjectColor`: desde D29 puede ser un id de la paleta o un
  // color personalizado en formato hexadecimal, y nulo para la Bandeja
  // (D27). Resolver siempre con `resolveProjectColorHex`, nunca indexando
  // `PROJECT_COLORS[color]` a mano.
  color: string | null;
  icon: string | null;
  description: string | null;
  parent_id: string | null;
  is_inbox: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  position: number;
};

const PROJECT_COLUMNS =
  "id, name, color, icon, description, parent_id, is_inbox, is_favorite, is_archived, position";

export const projectsQueryKey = ["projects"] as const;

export async function fetchProjects(): Promise<ProjectRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectRow[];
}

/**
 * Todos los proyectos del usuario (incluida la Bandeja), para la capa
 * interactiva de creación/edición/anidado. `initialData` siembra el caché
 * con lo que ya trajo el Server Component del layout (bloque 5), sin repetir
 * el fetch en el primer render del cliente.
 */
export function useProjects(initialData?: ProjectRow[]) {
  return useQuery({
    queryKey: projectsQueryKey,
    queryFn: fetchProjects,
    initialData,
  });
}
