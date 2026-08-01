"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Campos de recurrencia de las tareas visibles en el calendario (tarea 5.7,
 * bloques de vista previa): `TaskRow`/`TASK_LIST_COLUMNS`
 * (`lib/tasks/task-columns.ts`) no traen `recurrence_rule`/
 * `recurrence_ends_at`/`recurrence_count` — esa columna compartida la usan
 * Bandeja, Próximos, Proyecto, Hoy, Etiqueta y Filtro, así que ampliarla
 * queda fuera de este alcance. El calendario pide estos tres campos aparte,
 * solo para las tareas que ya tiene en pantalla. RLS acota a las propias,
 * como toda tabla `tasks`.
 */
export type RecurringTaskFields = {
  id: string;
  recurrence_rule: string;
  recurrence_ends_at: string | null;
  recurrence_count: number | null;
};

export function recurringTaskFieldsQueryKey(taskIds: string[]) {
  return ["calendar", "recurring-task-fields", taskIds.join(",")] as const;
}

async function fetchRecurringTaskFields(taskIds: string[]): Promise<RecurringTaskFields[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, recurrence_rule, recurrence_ends_at, recurrence_count")
    .in("id", taskIds)
    .not("recurrence_rule", "is", null);
  if (error) throw error;
  return (data ?? []) as RecurringTaskFields[];
}

export function useRecurringTaskFields(taskIds: string[]) {
  return useQuery({
    queryKey: recurringTaskFieldsQueryKey(taskIds),
    queryFn: () => fetchRecurringTaskFields(taskIds),
    enabled: taskIds.length > 0,
  });
}
