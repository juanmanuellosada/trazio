"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { parseQuery } from "@/lib/query-language/parse";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "@/lib/tasks/use-tasks";

export type FilterResults =
  | { status: "error"; message: string }
  | { status: "cargando" }
  | { status: "listo"; tasks: TaskRow[] };

/**
 * Resultados de la consulta guardada de un filtro (bloque 2.14, requirement
 * "Página de resultados de un filtro"): la consulta se parsea de nuevo acá,
 * nunca reutilizando algo compilado en el pasado (requirement "Un cambio
 * futuro del parser afecta a los filtros existentes"), y se evalúa contra
 * `buscar_tareas` — la misma función Postgres que la vista previa.
 */
export function useFilterResults(filterId: string, query: string): FilterResults {
  const parsed = parseQuery(query);

  const { data, isLoading } = useQuery({
    queryKey: ["filters", "resultados", filterId, parsed.ok ? JSON.stringify(parsed.ast) : null],
    queryFn: async () => {
      if (!parsed.ok) return [];
      const supabase = createClient();
      const { data, error } = await supabase.rpc("buscar_tareas", { ast: parsed.ast }).select(TASK_LIST_COLUMNS);
      if (error) throw error;
      return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
    },
    enabled: parsed.ok,
  });

  if (!parsed.ok) return { status: "error", message: parsed.error.message };
  if (isLoading || data === undefined) return { status: "cargando" };
  return { status: "listo", tasks: data };
}
