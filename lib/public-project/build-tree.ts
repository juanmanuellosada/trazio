import type { SharedTask } from "./types";

export type SharedTaskNode = SharedTask & { subtasks: SharedTaskNode[] };

function attachSubtasks(task: SharedTask, all: SharedTask[]): SharedTaskNode {
  return {
    ...task,
    subtasks: all.filter((t) => t.parent_id === task.id).map((t) => attachSubtasks(t, all)),
  };
}

/**
 * Tareas de nivel superior (`parent_id` nulo) de una sección puntual, o de
 * "sin sección" con `sectionId: null`, con sus subtareas ya anidadas sin
 * límite de niveles — mismo criterio que `lib/tasks/tree.ts` del lado
 * privado, pero sin drag & drop ni posición: `get_shared_project` ya
 * devuelve `tasks` ordenado (`order by position` dentro de la función), así
 * que acá alcanza con filtrar preservando ese orden, nunca reordenar.
 */
export function topLevelTasksForSection(tasks: SharedTask[], sectionId: string | null): SharedTaskNode[] {
  return tasks.filter((t) => t.section_id === sectionId && t.parent_id === null).map((t) => attachSubtasks(t, tasks));
}
