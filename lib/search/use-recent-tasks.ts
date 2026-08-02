"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { TASK_LIST_COLUMNS, toTaskRow, type TaskListRawRow, type TaskRow } from "@/lib/tasks/task-columns";
import { getRecentTaskIds } from "./recent-tasks";

async function fetchRecentTasks(ids: string[]): Promise<TaskRow[]> {
  if (ids.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase.from("tasks").select(TASK_LIST_COLUMNS).in("id", ids);
  if (error) throw error;
  const byId = new Map(((data ?? []) as unknown as TaskListRawRow[]).map((row) => [row.id, toTaskRow(row)]));
  // Mismo orden que en `localStorage` (más reciente primero): `.in()` no lo
  // garantiza. Una tarea borrada simplemente no está en `byId` y se cae del
  // resultado acá, sin ningún chequeo aparte (D-C).
  return ids.map((id) => byId.get(id)).filter((task): task is TaskRow => task != null);
}

/**
 * Tareas vistas recientemente (D-C), solo cuando `enabled` (el campo de la
 * paleta está vacío). Los IDs se releen de `localStorage` cada vez que
 * `enabled` pasa a `true` — al abrir la paleta o al borrar el término — para
 * reflejar lo último visto en esa sesión de uso.
 */
export function useRecentTasks(enabled: boolean) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    // En el servidor no hay `localStorage` (mismo motivo que `app-sidebar.tsx`
    // para el colapso del panel lateral): leerlo acá, después de montar, evita
    // un desajuste de hidratación entre el HTML del servidor y el del cliente.
    if (enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ver comentario de arriba
      setIds(getRecentTaskIds());
    }
  }, [enabled]);

  return useQuery({
    queryKey: ["recent-tasks", ids],
    queryFn: () => fetchRecentTasks(ids),
    enabled: enabled && ids.length > 0,
  });
}
