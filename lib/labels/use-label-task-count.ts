"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Conteo real de tareas que tienen asignada una etiqueta (bloque 4.2,
 * confirmación de borrado): a diferencia de borrar un proyecto, borrar una
 * etiqueta no borra ninguna tarea, solo la desasigna de todas las que la
 * tenían — el conteo real es igual de importante para que la confirmación
 * no invente un número. Mismo patrón que `useProjectSubtreeTaskCount`: sin
 * `select('*')`, sin N+1, y sin `staleTime` para que el número sea el real
 * al momento de decidir.
 */
export function useLabelTaskCount(labelId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["label-task-count", labelId],
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from("task_labels")
        .select("task_id", { count: "exact", head: true })
        .eq("label_id", labelId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled,
    staleTime: 0,
  });
}
