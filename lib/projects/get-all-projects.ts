import { createClient } from "@/lib/supabase/server";
import type { ProjectRow } from "./use-projects";

/**
 * Todos los proyectos del usuario (Bandeja y archivados incluidos), para
 * sembrar el caché de TanStack Query de la capa interactiva del bloque 6
 * (`useProjects`) desde el Server Component del layout — sin este fetch,
 * el árbol tendría que traer sus propios datos en el cliente antes del
 * primer render interactivo. `getSidebarProjects` sigue existiendo aparte:
 * es la proyección liviana (sin archivados, con el conteo de tareas) que ya
 * usaban el layout y `mobile-nav.tsx` antes del bloque 6.
 */
export async function getAllProjects(userId: string): Promise<ProjectRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("id, name, color, icon, description, parent_id, is_inbox, is_favorite, is_archived, is_example, position")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  return (data ?? []) as ProjectRow[];
}
