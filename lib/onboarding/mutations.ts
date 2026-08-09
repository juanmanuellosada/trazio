"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import { reportProjectError } from "@/lib/projects/errors";
import { projectsQueryKey } from "@/lib/projects/use-projects";
import { habitsQueryKey } from "@/lib/habits/use-habits";
import { filtersQueryKey } from "@/lib/filters/use-filters";

/**
 * Borra todo el contenido de ejemplo de una cuenta de una sola vez
 * (`openspec/changes/onboarding-con-ejemplos`, D-D): el proyecto de ejemplo
 * —con sus tareas, en cascada por FK—, el hábito de ejemplo y el filtro de
 * ejemplo. Sin esto, borrar solo el proyecto (el camino normal de
 * `useDeleteProject`) deja el hábito y el filtro sueltos en sus propias
 * pantallas, el modo de falla que el requirement prohíbe explícitamente:
 * son justo lo que se olvida, porque ninguno de los dos cuelga del
 * proyecto que la persona sí vio y borró.
 *
 * Ni `habits` ni `filters` tienen FK hacia `projects` (son entidades
 * independientes, ver `20260729170000_habits.sql` y
 * `20260729120012_filters.sql`), así que no hay cascada de base que lo
 * resuelva solo: los dos se identifican por `is_example = true` (a lo sumo
 * uno de cada uno por cuenta, `habits_one_example_per_user_idx` y
 * `filters_one_example_per_user_idx`), no por id. Los dos se borran antes
 * que el proyecto: son deletes simples, sin cascada, con muy poco margen de
 * fallar; el proyecto va al final porque es el camino ya probado en el
 * resto de la app. Si el proyecto llegara a fallar, lo ya borrado no
 * vuelve, pero el proyecto sigue ahí para reintentar la acción — el orden
 * inverso dejaría, en el peor caso, exactamente el hábito o el filtro
 * sueltos que esta acción existe para evitar.
 */
export function useDeleteExampleContent() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error: habitError } = await supabase.from("habits").delete().eq("is_example", true);
      if (habitError) throw habitError;

      const { error: filterError } = await supabase.from("filters").delete().eq("is_example", true);
      if (filterError) throw filterError;

      const { error: projectError } = await supabase.from("projects").delete().eq("id", projectId);
      if (projectError) throw projectError;
    },
    onError: reportProjectError,
    onSuccess: () => toastSuccess("Ejemplos eliminados. Esta acción no se puede deshacer."),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      queryClient.invalidateQueries({ queryKey: habitsQueryKey() });
      queryClient.invalidateQueries({ queryKey: filtersQueryKey });
    },
  });
}
