import { arrayMove } from "@dnd-kit/sortable";
import { positionForIndex } from "@/lib/tasks/tree";
import type { BoardColumn } from "./board";

export const COLUMN_DROPPABLE_PREFIX = "board-column:";

export type DragEndAction =
  | { type: "reorder"; columnId: string; taskId: string; position: number }
  | { type: "move"; taskId: string; fromColumnId: string; toColumnId: string };

/**
 * Qué hacer al soltar una tarjeta (extraído de `Board.handleDragEnd`, sin
 * cambiar la lógica, para poder probarlo sin simular un arrastre real de
 * `@dnd-kit` — que en jsdom no mide layout y no se puede confiar en él):
 * reordenar dentro de la misma columna (con la nueva posición ya calculada)
 * o mover a otra. `null` cuando no hay nada que hacer (soltó afuera de
 * cualquier zona, en la misma posición, o algo no se encuentra).
 */
export function resolveDragEnd(columns: BoardColumn[], activeId: string, overId: string | null): DragEndAction | null {
  if (!overId) return null;

  function columnOf(taskId: string): BoardColumn | undefined {
    return columns.find((column) => column.tasks.some((t) => t.id === taskId));
  }

  const fromColumn = columnOf(activeId);
  if (!fromColumn) return null;

  const toColumn = overId.startsWith(COLUMN_DROPPABLE_PREFIX)
    ? columns.find((c) => c.id === overId.slice(COLUMN_DROPPABLE_PREFIX.length))
    : columnOf(overId);
  if (!toColumn) return null;

  if (toColumn.id === fromColumn.id) {
    const activeIndex = fromColumn.tasks.findIndex((t) => t.id === activeId);
    const overIndex = fromColumn.tasks.findIndex((t) => t.id === overId);
    if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return null;

    const reordered = arrayMove(fromColumn.tasks, activeIndex, overIndex);
    const newIndex = reordered.findIndex((t) => t.id === activeId);
    const others = fromColumn.tasks.filter((t) => t.id !== activeId).map((t) => t.position);
    return { type: "reorder", columnId: fromColumn.id, taskId: activeId, position: positionForIndex(others, newIndex) };
  }

  return { type: "move", taskId: activeId, fromColumnId: fromColumn.id, toColumnId: toColumn.id };
}
