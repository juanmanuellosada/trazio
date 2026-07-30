import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { QuickFilters } from "./schema";

/**
 * Filtros rápidos y "mostrar completadas" de la barra de opciones (bloque
 * 6.6, requirements "Mostrar u ocultar tareas completadas" y "Filtrar por
 * fecha límite, prioridad y etiqueta"), combinables entre sí (todas las
 * condiciones activas se exigen a la vez).
 */
export function applyQuickFilters<T extends TaskRow>(
  tasks: T[],
  quickFilters: QuickFilters,
  showCompleted: boolean,
): T[] {
  return tasks.filter((task) => {
    if (!showCompleted && task.completed_at) return false;
    if (quickFilters.priority != null && task.priority !== quickFilters.priority) return false;
    if (quickFilters.labelId != null && !task.labels.some((label) => label.id === quickFilters.labelId)) return false;
    if (quickFilters.deadline === "con" && !task.deadline) return false;
    if (quickFilters.deadline === "sin" && task.deadline) return false;
    return true;
  });
}
