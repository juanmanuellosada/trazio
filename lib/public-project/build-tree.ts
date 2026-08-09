import type { SharedTask } from "./types";

/** Lo mínimo que necesita el armado del árbol. `SharedTask` y `TaskRow` lo cumplen los dos. */
export type TreeTaskLike = { id: string; section_id: string | null; parent_id: string | null };

export type TaskNode<T extends TreeTaskLike> = T & { subtasks: TaskNode<T>[] };

/** Alias que preserva el nombre que ya importa `components/public/public-task-row.tsx`. */
export type SharedTaskNode = TaskNode<SharedTask>;

function attachSubtasks<T extends TreeTaskLike>(task: T, all: T[]): TaskNode<T> {
  return {
    ...task,
    subtasks: all.filter((t) => t.parent_id === task.id).map((t) => attachSubtasks(t, all)),
  };
}

/**
 * Tareas de nivel superior (`parent_id` nulo) de una sección puntual, o de
 * "sin sección" con `sectionId: null`, con sus subtareas ya anidadas sin
 * límite de niveles — mismo criterio que `lib/tasks/tree.ts` del lado
 * privado, pero sin drag & drop ni posición: el llamador ya entrega `tasks`
 * ordenado (`get_shared_project` del lado público, `fetchTasks` del lado
 * privado), así que acá alcanza con filtrar preservando ese orden, nunca
 * reordenar. Genérica en `T` para servir tanto a `SharedTask` (vista
 * pública) como a `TaskRow` (`lib/tasks/task-columns.ts`, lado privado).
 */
export function topLevelTasksForSection<T extends TreeTaskLike>(tasks: T[], sectionId: string | null): TaskNode<T>[] {
  return tasks.filter((t) => t.section_id === sectionId && t.parent_id === null).map((t) => attachSubtasks(t, tasks));
}
