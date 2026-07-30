"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { LabelChip } from "@/lib/tasks/use-tasks";

export const labelsQueryKey = ["labels"] as const;

/**
 * Etiqueta con su marca de favorita (bloque 3.1, capacidad
 * `navegacion-por-etiqueta`): `labels.is_favorite` ya existe en la base
 * desde fase 1 pero hasta acá no se leía desde la interfaz. Se extiende
 * `LabelChip` en vez de tocarlo porque ese tipo también describe los chips
 * embebidos en `task_labels(labels(...))` de las vistas de tareas, que no
 * necesitan ni seleccionan esta columna.
 */
export type Label = LabelChip & { is_favorite: boolean };

/**
 * Todas las etiquetas del usuario, para el selector de etiquetas del
 * detalle de una tarea (bloque 7.12) y para la administración de etiquetas
 * (bloque 3.3). La creación de etiquetas es del alta rápida (`#`, bloque 9);
 * acá solo se leen para poder asignarlas, quitarlas o marcarlas favoritas.
 */
export async function fetchLabels(): Promise<Label[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("labels")
    .select("id, name, color, is_favorite")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Label[];
}

export function useLabels(initialData?: Label[]) {
  return useQuery({ queryKey: labelsQueryKey, queryFn: fetchLabels, initialData });
}
