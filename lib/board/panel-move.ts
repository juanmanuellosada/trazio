import { formatInTimeZone } from "date-fns-tz";
import { toDueAt } from "@/lib/parser/dates";
import { nextSiblingPositionInContext } from "@/lib/tasks/tree";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { TASK_PRIORITIES } from "@/lib/validation/tasks";
import { UNDATED_COLUMN_ID, UNSECTIONED_COLUMN_ID } from "./panel-columns";

/**
 * Qué escribe mover una tarea a una columna dada (D-C del design, grupo 2 de
 * `tasks.md`): un patch por campo, cada uno con su propia trampa. Ninguna de
 * las tres hace ninguna consulta — reciben lo que ya tiene quien llama (la
 * lista de tareas del proyecto, la tarea que se mueve, la zona horaria).
 */

/**
 * Mover por sección escribe la sección **y** la posición (última del
 * destino, mismo criterio que ya usa `nextSiblingPositionInContext` para
 * cualquier otro alta o movimiento). Solo tiene sentido dentro de un mismo
 * proyecto: la base rechaza con un disparador una sección de otro proyecto,
 * así que quien llama nunca debería ofrecer, como columna, una sección que
 * no sea la del proyecto que se está mostrando.
 */
export function sectionMovePatch(
  projectTasks: TaskRow[],
  projectId: string,
  toColumnId: string,
): { section_id: string | null; position: number } {
  const sectionId = toColumnId === UNSECTIONED_COLUMN_ID ? null : toColumnId;
  const position = nextSiblingPositionInContext(projectTasks, { projectId, sectionId, parentId: null });
  return { section_id: sectionId, position };
}

/**
 * Mover por fecha escribe `due_date` — pero si la tarea ya tenía hora
 * (`due_at`), esa hora **se conserva**: se recalcula `due_at` con el nuevo
 * día y la misma hora, en vez de vaciarla en silencio (el defecto real que
 * hoy tiene `ProximosView`). Mismo criterio que ya usa `applyQuickDate` en
 * `components/tasks/task-row.tsx` para los accesos rápidos de fecha del menú
 * contextual. Mover a "Sin fecha" borra la fecha entera, hora incluida —
 * es la acción explícita de vaciarla, no un movimiento de día.
 */
export function dateMovePatch(
  task: { due_at: string | null },
  toColumnId: string,
  timezone: string,
): { due_date: string | null; due_at: string | null } {
  if (toColumnId === UNDATED_COLUMN_ID) return { due_date: null, due_at: null };

  if (task.due_at) {
    const [hour, minute] = formatInTimeZone(task.due_at, timezone, "HH:mm").split(":").map(Number);
    const [y, m, d] = toColumnId.split("-").map(Number);
    return { due_date: null, due_at: toDueAt({ y, m, d }, hour, minute, timezone) };
  }

  return { due_date: toColumnId, due_at: null };
}

/** Mover por prioridad escribe la prioridad. Dominio cerrado de cuatro: un id de columna fuera de ese conjunto no escribe nada, en vez de guardar cualquier número. */
export function priorityMovePatch(toColumnId: string): { priority: number } | null {
  const value = Number(toColumnId);
  const isValidPriority = TASK_PRIORITIES.some((p) => p.value === value);
  return isValidPriority ? { priority: value } : null;
}
