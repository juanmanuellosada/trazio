"use client";

import { type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { positionForIndex } from "@/lib/tasks/tree";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { TaskRow } from "@/components/tasks/task-row";

export type BoardColumn = { id: string; title: string; tasks: TaskRowData[] };

const COLUMN_DROPPABLE_PREFIX = "board-column:";

function ColumnDropZone({ column, children }: { column: BoardColumn; children: ReactNode }) {
  const { setNodeRef } = useDroppable({ id: `${COLUMN_DROPPABLE_PREFIX}${column.id}` });
  return (
    <div ref={setNodeRef} className="flex min-h-16 flex-1 flex-col gap-1">
      {children}
    </div>
  );
}

/**
 * Modo panel (bloque 6.7, D-I): columnas horizontales con arrastre vertical
 * (reordenar dentro de una columna) y horizontal (mover de columna), sobre
 * el mismo `@dnd-kit` que ya usa `TaskList` — un único `DndContext` para
 * todas las columnas, cada una con su propio `SortableContext`, siguiendo
 * el patrón estándar de "múltiples contenedores" de la librería.
 *
 * Por D24 (bloque 6.11), el menú contextual de cada tarjeta (que ya trae
 * `TaskRow`: "Mover…", "Abrir detalle" con el editor de fecha) sigue
 * disponible sin arrastrar nada; acá solo se suma el atajo.
 *
 * `draggable` en `false` (orden distinto de manual, o agrupación activa —
 * bloque 6.10) apaga el arrastre: sin manija ni `SortableContext`, las
 * tarjetas quedan como una lista de solo lectura por columna (el
 * `DndContext` sigue montado, pero sin nada arrastrable no hace nada).
 */
export function Board({
  columns,
  allTasks,
  draggable,
  onReorderWithinColumn,
  onMoveAcrossColumns,
  emptyColumnLabel = "Sin tareas.",
}: {
  columns: BoardColumn[];
  allTasks: TaskRowData[];
  draggable: boolean;
  onReorderWithinColumn: (columnId: string, taskId: string, position: number) => void;
  onMoveAcrossColumns: (taskId: string, fromColumnId: string, toColumnId: string) => void;
  emptyColumnLabel?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Selección múltiple (bloque 7.10-7.13): orden visual para `⇧clic`, todas
  // las columnas de izquierda a derecha, cada una de arriba a abajo — el
  // mismo orden en que se ven las tarjetas en pantalla.
  const selectionOrderIds = columns.flatMap((column) => column.tasks.map((t) => t.id));

  function columnOf(taskId: string): BoardColumn | undefined {
    return columns.find((column) => column.tasks.some((t) => t.id === taskId));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const fromColumn = columnOf(active.id as string);
    if (!fromColumn) return;

    const overIdStr = String(over.id);
    const toColumn = overIdStr.startsWith(COLUMN_DROPPABLE_PREFIX)
      ? columns.find((c) => c.id === overIdStr.slice(COLUMN_DROPPABLE_PREFIX.length))
      : columnOf(over.id as string);
    if (!toColumn) return;

    if (toColumn.id === fromColumn.id) {
      const activeIndex = fromColumn.tasks.findIndex((t) => t.id === active.id);
      const overIndex = fromColumn.tasks.findIndex((t) => t.id === over.id);
      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) return;

      const reordered = arrayMove(fromColumn.tasks, activeIndex, overIndex);
      const newIndex = reordered.findIndex((t) => t.id === active.id);
      const others = fromColumn.tasks.filter((t) => t.id !== active.id).map((t) => t.position);
      onReorderWithinColumn(fromColumn.id, active.id as string, positionForIndex(others, newIndex));
      return;
    }

    onMoveAcrossColumns(active.id as string, fromColumn.id, toColumn.id);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex h-full items-start gap-3 overflow-x-auto pb-2">
        {columns.map((column) => (
          <div key={column.id} className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-surface/60 p-2">
            <h3 className="flex items-center justify-between px-1 text-sm font-semibold text-foreground">
              <span className="truncate">{column.title}</span>
              <span className="shrink-0 text-xs font-normal text-text-secondary">{column.tasks.length}</span>
            </h3>
            <ColumnDropZone column={column}>
              {draggable ? (
                <SortableContext items={column.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <ul className="flex flex-col gap-1">
                    {column.tasks.map((task) => (
                      <li key={task.id} className="rounded-md bg-background">
                        <TaskRow
                          task={task}
                          allTasks={allTasks}
                          siblings={[]}
                          depth={0}
                          variant="flat"
                          showDragHandle
                          sortableData={{ columnId: column.id }}
                          selectionOrderIds={selectionOrderIds}
                        />
                      </li>
                    ))}
                  </ul>
                </SortableContext>
              ) : (
                <ul className="flex flex-col gap-1">
                  {column.tasks.map((task) => (
                    <li key={task.id} className="rounded-md bg-background">
                      <TaskRow
                        task={task}
                        allTasks={allTasks}
                        siblings={[]}
                        depth={0}
                        variant="flat"
                        selectionOrderIds={selectionOrderIds}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {column.tasks.length === 0 && <p className="px-1 py-2 text-xs text-text-secondary">{emptyColumnLabel}</p>}
            </ColumnDropZone>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
