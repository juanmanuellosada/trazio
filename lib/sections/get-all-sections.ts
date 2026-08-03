import { createClient } from "@/lib/supabase/server";
import type { SectionRow } from "./use-sections";

/**
 * Todas las secciones del usuario, sin filtrar por proyecto (bloque `fila-de-
 * tarea-en-niveles`, D-D): una consulta mayorista, para sembrar el caché de
 * `useAllSections` desde el layout del bloque 5 — igual que `getAllProjects`
 * siembra `useProjects`. Nunca de a un proyecto por vez: en una lista que
 * cruza proyectos (Hoy, Próximos, Etiqueta, Filtro, Buscador, Completado) eso
 * sería una consulta por fila, el patrón que prohíbe
 * `.claude/rules/database.md`.
 */
export async function getAllSections(userId: string): Promise<SectionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sections")
    .select("id, project_id, name, description, position, is_collapsed")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  return (data ?? []) as SectionRow[];
}
