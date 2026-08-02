"use client";

import { useEffect } from "react";
import { addRecentTaskId } from "@/lib/search/recent-tasks";

/**
 * Registra "visto" para el grupo de recientes del buscador (`buscador-como-paleta`,
 * D-C) cuando se entra directo por la ruta propia de una tarea (`/tarea/[id]`),
 * en vez de abrir el detalle como modal — ese otro camino ya lo cubre
 * `TaskDetailProvider.open` (`task-detail-context.tsx`). Componente aparte, sin
 * tocar `TaskDetailContent`: no renderiza nada, solo el efecto de registro.
 */
export function RecordRecentTaskView({ taskId }: { taskId: string }) {
  useEffect(() => {
    addRecentTaskId(taskId);
  }, [taskId]);

  return null;
}
