import { createClient } from "@/lib/supabase/server";

export type SidebarProject = {
  id: string;
  name: string;
  // `string`: id de la paleta o color personalizado en hexadecimal (D29).
  // La Bandeja se excluye más abajo, así que acá nunca es nulo.
  color: string;
  icon: string | null;
  parentId: string | null;
  isFavorite: boolean;
  taskCount: number;
};

export type SidebarProjectsData = {
  projects: SidebarProject[];
  // Conteo de pendientes de la Bandeja de entrada, para el acceso principal
  // del panel lateral (mismo patrón que el contador de Hoy). Sale del mismo
  // `taskRows` de acá abajo: la Bandeja es un proyecto más para esa consulta,
  // solo se excluye del árbol de `projects`.
  inboxTaskCount: number;
};

/**
 * Proyectos del usuario para el panel lateral (bloque 5.3). La Bandeja de
 * entrada se excluye acá: se muestra aparte, como acceso principal fijo
 * (no como parte del árbol). El conteo de tareas es una sola consulta a
 * `tasks` (solo `project_id`) reducida en memoria, para no hacer N+1 por
 * proyecto. El CRUD de proyectos es el bloque 6: acá solo se leen.
 */
export async function getSidebarProjects(userId: string): Promise<SidebarProjectsData> {
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
  let inboxTaskCount = 0;
  for (const row of projectRows ?? []) {
    if (row.is_inbox) {
      inboxTaskCount = counts.get(row.id) ?? 0;
      continue;
    }
    projects.push({
      id: row.id,
      name: row.name,
      color: row.color as string,
      icon: row.icon,
      parentId: row.parent_id,
      isFavorite: row.is_favorite,
      taskCount: counts.get(row.id) ?? 0,
    });
  }

  return { projects, inboxTaskCount };
}
