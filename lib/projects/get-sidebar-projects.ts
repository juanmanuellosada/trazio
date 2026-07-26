import { createClient } from "@/lib/supabase/server";
import type { ProjectColor } from "@/lib/validation/colors";

export type SidebarProject = {
  id: string;
  name: string;
  color: ProjectColor;
  icon: string | null;
  parentId: string | null;
  isFavorite: boolean;
  taskCount: number;
};

/**
 * Proyectos del usuario para el panel lateral (bloque 5.3). La Bandeja de
 * entrada se excluye acá: se muestra aparte, como acceso principal fijo
 * (no como parte del árbol). El conteo de tareas es una sola consulta a
 * `tasks` (solo `project_id`) reducida en memoria, para no hacer N+1 por
 * proyecto. El CRUD de proyectos es el bloque 6: acá solo se leen.
 */
export async function getSidebarProjects(userId: string): Promise<SidebarProject[]> {
  const supabase = await createClient();

  const [{ data: projectRows }, { data: taskRows }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, color, icon, parent_id, is_favorite, is_inbox")
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("position", { ascending: true }),
    supabase
      .from("tasks")
      .select("project_id")
      .eq("user_id", userId)
      .is("completed_at", null),
  ]);

  const counts = new Map<string, number>();
  for (const row of taskRows ?? []) {
    counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1);
  }

  const projects: SidebarProject[] = [];
  for (const row of projectRows ?? []) {
    if (row.is_inbox) {
      continue;
    }
    projects.push({
      id: row.id,
      name: row.name,
      color: row.color as ProjectColor,
      icon: row.icon,
      parentId: row.parent_id,
      isFavorite: row.is_favorite,
      taskCount: counts.get(row.id) ?? 0,
    });
  }

  return projects;
}
