import { taskDueDay } from "@/lib/dates/today";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { OrderOption } from "./schema";

/**
 * "Por fecha" del control de orden (bloque 6.6): vencimiento ascendente,
 * con las tareas sin fecha al final; a igual día, la que tiene hora va
 * antes que la que no, ordenadas por hora ascendente (D25: "Hoy ordena por
 * hora" es este mismo criterio aplicado a un único día); a igual fecha y
 * hora, desempata por prioridad descendente. Mismo criterio que ya definen
 * los defaults de Hoy, Próximos, Etiqueta y Filtro en
 * `specs/opciones-de-vista`, generalizado a cualquier pantalla.
 */
function compareByDueDate(a: TaskRow, b: TaskRow, timezone: string): number {
  const dayA = taskDueDay(a, timezone);
  const dayB = taskDueDay(b, timezone);
  if (dayA === null && dayB === null) return a.priority - b.priority;
  if (dayA === null) return 1;
  if (dayB === null) return -1;
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;

  if (a.due_at && b.due_at) {
    const diff = new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    if (diff !== 0) return diff;
  } else if (a.due_at && !b.due_at) {
    return -1;
  } else if (!a.due_at && b.due_at) {
    return 1;
  }

  // Prioridad descendente (la más urgente primero): `1` es "Urgente" y `4`
  // es "Baja" (`lib/validation/tasks.ts`), así que "descendente" en
  // severidad es ascendente en el número guardado.
  return a.priority - b.priority;
}

/**
 * Aplica el control de orden de la barra de opciones (bloque 6.6) a una
 * lista de tareas ya traída. "manual" ordena por `position` — el mismo
 * orden que ya arrastra `TaskList` en Bandeja y Proyecto; en las vistas
 * transversales (Hoy, Próximos, Etiqueta, Filtro) `position` no es
 * comparable entre proyectos (D25), así que "manual" ahí solo preserva el
 * orden con el que llegaron las tareas.
 */
export function orderTasks<T extends TaskRow>(tasks: T[], order: OrderOption, timezone: string): T[] {
  const sorted = [...tasks];
  switch (order) {
    case "nombre":
      sorted.sort((a, b) => a.title.localeCompare(b.title, "es"));
      return sorted;
    case "prioridad":
      // Ascendente en el número guardado = descendente en severidad (1 es "Urgente").
      sorted.sort((a, b) => a.priority - b.priority);
      return sorted;
    case "fecha":
      sorted.sort((a, b) => compareByDueDate(a, b, timezone));
      return sorted;
    case "manual":
    default:
      sorted.sort((a, b) => a.position - b.position);
      return sorted;
  }
}
