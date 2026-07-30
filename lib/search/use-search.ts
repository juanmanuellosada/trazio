"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "@/lib/tasks/use-tasks";

/** Requirement "El buscador requiere un mínimo de dos caracteres". */
const MIN_CHARS = 2;
/** Requirement "El buscador devuelve como máximo 50 resultados". */
const MAX_RESULTS = 50;
const DEBOUNCE_MS = 250;

export type SearchState =
  | { status: "corto" }
  | { status: "buscando" }
  | { status: "listo"; tasks: TaskRow[] };

/**
 * Busca tareas por título y descripción (capacidad `buscador`, D-B de
 * design.md): mismo `search_vector` y misma configuración
 * `spanish_unaccent` que el campo `search:` del lenguaje de consulta —
 * "reunion" encuentra "reunión", "reuniones" también, y "renuion" (con
 * error de tipeo) no encuentra nada. Orden: pendientes primero
 * (`completed_at` nulo), después completadas por fecha de completado
 * (mismo criterio que `CompletedView`); dentro del grupo de pendientes, por
 * fecha de creación descendente, ya que el spec no fija qué fecha usar ahí.
 */
export async function searchTasks(term: string): Promise<TaskRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_LIST_COLUMNS)
    .textSearch("search_vector", term, { type: "plain", config: "spanish_unaccent" })
    .order("completed_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(MAX_RESULTS);
  if (error) throw error;
  return ((data ?? []) as unknown as TaskListRawRow[]).map(toTaskRow);
}

export function useSearch(term: string): SearchState {
  const [debounced, setDebounced] = useState(term);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  const trimmed = debounced.trim();
  const enabled = trimmed.length >= MIN_CHARS;

  const { data, isFetching } = useQuery({
    queryKey: ["search", trimmed],
    queryFn: () => searchTasks(trimmed),
    enabled,
  });

  if (!enabled) return { status: "corto" };
  if (isFetching || data === undefined) return { status: "buscando" };
  return { status: "listo", tasks: data };
}
