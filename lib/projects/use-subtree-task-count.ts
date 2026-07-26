"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { subtreeIds } from "./tree";
import type { ProjectRow } from "./use-projects";

/**
 * Conteo real de tareas que se pierden al borrar un proyecto (bloque 6.5):
 * todas las tareas (incluidas subtareas, que son filas de `tasks` con su
 * propio `project_id`) del proyecto y de todo su subárbol de subproyectos,
 * en una sola consulta — no una por proyecto. Solo corre mientras el
 * diálogo de confirmación está abierto (`enabled`), y sin `staleTime` para
 * que el número sea el real en el momento de decidir, no uno cacheado.
 */
export function useProjectSubtreeTaskCount(
  projectId: string,
  allProjects: ProjectRow[],
  enabled: boolean,
) {
  const ids = subtreeIds(allProjects, projectId);

  return useQuery({
    queryKey: ["project-subtree-task-count", projectId, ids],
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .in("project_id", ids);
      if (error) throw error;
      return count ?? 0;
    },
    enabled,
    staleTime: 0,
  });
}
