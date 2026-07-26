import { SIBLING_SPACING, needsRebalance, positionForIndex, positionForSwap } from "@/lib/projects/tree";
import type { TaskRow } from "./use-tasks";

export { SIBLING_SPACING, needsRebalance, positionForIndex, positionForSwap };

/**
 * Contexto de hermanos de una tarea (requirement "Reordenar una tarea" del
 * spec de `tareas`): mismo nivel de subtareas cuando tiene `parentId`, o
 * misma sección cuando es de primer nivel. `sectionId` se ignora en el
 * primer caso: una vez anidada, la sección de origen no participa del
 * agrupamiento de hermanos.
 */
export type TaskContext = { projectId: string; sectionId: string | null; parentId: string | null };

/** Hermanos de una tarea en su contexto, ordenados por posición, excluyendo `excludeId`. */
export function siblingsOfTask(tasks: TaskRow[], context: TaskContext, excludeId?: string): TaskRow[] {
  return tasks
    .filter((t) => {
      if (t.id === excludeId) return false;
      if (t.project_id !== context.projectId) return false;
      if (context.parentId !== null) return t.parent_id === context.parentId;
      return t.parent_id === null && t.section_id === context.sectionId;
    })
    .sort((a, b) => a.position - b.position);
}

/** Posición para insertar como último hermano del contexto dado. */
export function nextSiblingPositionInContext(tasks: TaskRow[], context: TaskContext): number {
  const siblings = siblingsOfTask(tasks, context);
  if (siblings.length === 0) return SIBLING_SPACING;
  return siblings[siblings.length - 1].position + SIBLING_SPACING;
}

/** ids de una tarea y todos sus descendientes (subtareas sin límite de niveles), el propio incluido. */
export function taskSubtreeIds(tasks: TaskRow[], rootId: string): string[] {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = tasks.filter((t) => t.parent_id !== null && frontier.includes(t.parent_id)).map((t) => t.id);
    ids.push(...children);
    frontier = children;
  }
  return ids;
}

export type MoveTarget = { parentId: string | null; sectionId: string | null; position: number };

/**
 * Indentar (`Tab`, requirement "Convertir una tarea en subtarea por
 * teclado"): la tarea pasa a ser la última subtarea de su hermano
 * inmediatamente anterior en el mismo contexto. `null` si ya es la primera
 * de su contexto (no hay hermano anterior del cual colgar).
 */
export function computeIndent(tasks: TaskRow[], task: TaskRow): MoveTarget | null {
  const siblings = siblingsOfTask(tasks, { projectId: task.project_id, sectionId: task.section_id, parentId: task.parent_id });
  const index = siblings.findIndex((t) => t.id === task.id);
  if (index <= 0) return null;

  const newParent = siblings[index - 1];
  const position = nextSiblingPositionInContext(tasks, {
    projectId: task.project_id,
    sectionId: newParent.section_id,
    parentId: newParent.id,
  });
  return { parentId: newParent.id, sectionId: task.section_id, position };
}

/**
 * Desindentar (`Shift+Tab`): la tarea pasa a ser hermana de su padre
 * actual, ubicada justo después de él. `null` si ya es de primer nivel (no
 * tiene padre del cual salir).
 */
export function computeOutdent(tasks: TaskRow[], task: TaskRow): MoveTarget | null {
  if (task.parent_id === null) return null;
  const parent = tasks.find((t) => t.id === task.parent_id);
  if (!parent) return null;

  const grandparentContext: TaskContext = {
    projectId: parent.project_id,
    sectionId: parent.section_id,
    parentId: parent.parent_id,
  };
  const grandSiblings = siblingsOfTask(tasks, grandparentContext);
  const parentIndex = grandSiblings.findIndex((t) => t.id === parent.id);
  const position = positionForSwapInsertAfter(grandSiblings, parentIndex);

  return { parentId: parent.parent_id, sectionId: parent.section_id, position };
}

/** Posición para insertar inmediatamente después del elemento en `index` de `ordered` (usado por desindentar y duplicar). */
function positionForSwapInsertAfter(ordered: { position: number }[], index: number): number {
  const after = ordered[index + 1];
  const at = ordered[index];
  return after ? (at.position + after.position) / 2 : at.position + SIBLING_SPACING;
}

/** Posición para insertar la copia de una tarea duplicada, justo después de la original (F2 del design). */
export function positionAfterOriginal(tasks: TaskRow[], original: TaskRow): number {
  const siblings = siblingsOfTask(tasks, {
    projectId: original.project_id,
    sectionId: original.section_id,
    parentId: original.parent_id,
  });
  const index = siblings.findIndex((t) => t.id === original.id);
  // La original siempre está en su propia lista de hermanos (no se excluyó), así que index >= 0.
  return positionForSwapInsertAfter(siblings, index);
}
