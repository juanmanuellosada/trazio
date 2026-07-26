"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { LabelChip } from "@/lib/tasks/use-tasks";

export const labelsQueryKey = ["labels"] as const;

/**
 * Todas las etiquetas del usuario, para el selector de etiquetas del
 * detalle de una tarea (bloque 7.12). La creación de etiquetas es del alta
 * rápida (`#`, bloque 9); acá solo se leen para poder asignarlas o
 * quitarlas de una tarea existente.
 */
export async function fetchLabels(): Promise<LabelChip[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("labels").select("id, name, color").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LabelChip[];
}

export function useLabels(initialData?: LabelChip[]) {
  return useQuery({ queryKey: labelsQueryKey, queryFn: fetchLabels, initialData });
}
