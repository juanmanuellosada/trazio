import type { ProjectRow } from "./use-projects";

/** Máximo de niveles de anidamiento, igual al que impone la base (raíz = nivel 1). */
export const MAX_PROJECT_DEPTH = 3;

/** Espaciado entre hermanos nuevos; el mismo valor que usan las funciones de rebalanceo. */
export const SIBLING_SPACING = 1000;

/** Cuando el hueco entre dos posiciones baja de esto, hace falta rebalancear. */
export const REBALANCE_THRESHOLD = 0.0001;

/** Profundidad de un proyecto en el árbol (raíz = 1). */
export function projectDepth(projects: ProjectRow[], projectId: string): number {
  const byId = new Map(projects.map((p) => [p.id, p]));
  let depth = 1;
  let current = byId.get(projectId);
  while (current?.parent_id) {
    depth += 1;
    current = byId.get(current.parent_id);
  }
  return depth;
}

/** ids del proyecto y todos sus descendientes (el propio incluido). */
export function subtreeIds(projects: ProjectRow[], rootId: string): string[] {
  const ids = [rootId];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = projects
      .filter((p) => p.parent_id !== null && frontier.includes(p.parent_id))
      .map((p) => p.id);
    ids.push(...children);
    frontier = children;
  }
  return ids;
}

/** true si mover `projectId` bajo `candidateParentId` lo dejaría como su propio ancestro. */
export function wouldCreateCycle(
  projects: ProjectRow[],
  projectId: string,
  candidateParentId: string,
): boolean {
  return subtreeIds(projects, projectId).includes(candidateParentId);
}

/** Hermanos de `parentId`, en orden, excluyendo `excludeId` (el que se está moviendo). */
export function siblingsOf(
  projects: ProjectRow[],
  parentId: string | null,
  excludeId?: string,
): ProjectRow[] {
  return projects
    .filter((p) => p.parent_id === parentId && p.id !== excludeId)
    .sort((a, b) => a.position - b.position);
}

/** Posición para insertar como último hermano de `parentId`. */
export function nextSiblingPosition(projects: ProjectRow[], parentId: string | null): number {
  const siblings = siblingsOf(projects, parentId);
  if (siblings.length === 0) return SIBLING_SPACING;
  return siblings[siblings.length - 1].position + SIBLING_SPACING;
}

/**
 * Posición para insertar en el índice `index` entre `orderedSiblingPositions`
 * (posiciones ya ordenadas de los hermanos, sin contar el elemento movido).
 */
export function positionForIndex(orderedSiblingPositions: number[], index: number): number {
  if (orderedSiblingPositions.length === 0) return SIBLING_SPACING;
  if (index <= 0) return orderedSiblingPositions[0] / 2;
  if (index >= orderedSiblingPositions.length) {
    return orderedSiblingPositions[orderedSiblingPositions.length - 1] + SIBLING_SPACING;
  }
  return (orderedSiblingPositions[index - 1] + orderedSiblingPositions[index]) / 2;
}

/** true si `position` quedó demasiado cerca de algún vecino y hace falta rebalancear. */
export function needsRebalance(orderedSiblingPositions: number[], position: number): boolean {
  return orderedSiblingPositions.some(
    (p) => p !== position && Math.abs(p - position) < REBALANCE_THRESHOLD,
  );
}

/**
 * Posición para intercambiar un elemento con su vecino inmediato (el "mover
 * arriba"/"mover abajo" del menú contextual, camino alternativo al
 * arrastre). `sorted` incluye al propio elemento movido, ordenado por
 * posición; `currentIndex` es su índice ahí. Devuelve `null` si ya está en
 * el extremo correspondiente.
 */
/** Posición para insertar la copia de un proyecto duplicado, justo después del original (`duplicar-un-proyecto`). */
export function positionAfterOriginal(projects: ProjectRow[], original: ProjectRow): number {
  const siblings = siblingsOf(projects, original.parent_id);
  const index = siblings.findIndex((p) => p.id === original.id);
  const after = siblings[index + 1];
  return after ? (original.position + after.position) / 2 : original.position + SIBLING_SPACING;
}

export function positionForSwap<T extends { position: number }>(
  sorted: T[],
  currentIndex: number,
  direction: "up" | "down",
): number | null {
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= sorted.length) return null;

  if (direction === "up") {
    const before = sorted[targetIndex - 1];
    const target = sorted[targetIndex];
    return before ? (before.position + target.position) / 2 : target.position / 2;
  }

  const target = sorted[targetIndex];
  const after = sorted[targetIndex + 1];
  return after ? (target.position + after.position) / 2 : target.position + SIBLING_SPACING;
}
