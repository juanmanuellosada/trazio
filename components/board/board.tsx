"use client";

import { type ReactNode, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Inbox } from "lucide-react";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { COLUMN_DROPPABLE_PREFIX, resolveDragEnd } from "./resolve-drag-end";

export type BoardColumn = { id: string; title: string; tasks: TaskRowData[] };

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
 * `draggable` en `false` apaga el arrastre por completo: sin manija ni
 * `SortableContext`, las tarjetas quedan como una lista de solo lectura por
 * columna (el `DndContext` sigue montado, pero sin nada arrastrable no hace
 * nada). Desde `panel-con-columnas-por-campo` (D-C/D-I del design) el
 * arrastre entre columnas está habilitado con cualquier agrupación —
 * escribe el campo que la columna define—, así que quien llama pasa
 * `draggable` en `true` salvo que no haya ningún campo comparable para
 * reordenar (Hoy no tiene ese caso: mueve prioridad, no posición). Solo
 * reordenar **dentro** de una columna sigue exigiendo orden manual, y eso lo
 * decide `onReorderWithinColumn` de quien llama, no este componente.
 *
 * `openspec/changes/panel-con-columnas-por-campo/design.md`, D-D: la
 * tarjeta que se arrastra se dibuja en un `DragOverlay` (un portal al
 * cuerpo del documento, por dentro de `@dnd-kit`) en vez del nodo original.
 * El tablero mismo tiene desplazamiento horizontal, y eso también recorta
 * en vertical (CSS); encima el contenedor de la pantalla y `<main>` recortan
 * de nuevo — tres capas. El portal es la única forma de que la tarjeta
 * arrastrada quede fuera de las tres a la vez. `activeId` guarda cuál es
 * la tarjeta activa al empezar (nadie lo necesitaba antes de esto), para
 * poder dibujar su copia en el overlay: se busca en `columns`, no en
 * `allTasks` (que en Próximos no incluye las tareas sin fecha).
 * `wrapperElement="ul"` porque `TaskRow` ya devuelve su propio `<li>`
 * (ver el comentario de `variant` en `task-row.tsx`): sin esto quedaría un
 * `<li>` sin `<ul>`/`<ol>` que lo contenga, el mismo tipo de marcado
 * inválido que la tarea 6.1 corrige para las columnas.
 */
export function Board({
  columns,
  allTasks,
  draggable,
  onReorderWithinColumn,
  onMoveAcrossColumns,
  renderColumnEmptyAction,
  renderColumnFooter,
}: {
  columns: BoardColumn[];
  allTasks: TaskRowData[];
  draggable: boolean;
  onReorderWithinColumn: (columnId: string, taskId: string, position: number) => void;
  onMoveAcrossColumns: (taskId: string, fromColumnId: string, toColumnId: string) => void;
  /**
   * "Agregar tarea" dentro de la columna vacía (grupo 5, D-F): mismo
   * componente que `renderColumnFooter`, para que una columna sin tareas no
   * quede solo con el texto que explica qué va a aparecer (tarea 6.2).
   */
  renderColumnEmptyAction?: (column: BoardColumn) => ReactNode;
  /**
   * "Agregar tarea" al pie de una columna que ya tiene tareas (grupo 5,
   * D-F): mutuamente excluyente con `renderColumnEmptyAction` (una columna
   * vacía muestra la acción dentro del estado vacío, no las dos a la vez).
   */
  renderColumnFooter?: (column: BoardColumn) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = activeId ? columns.flatMap((column) => column.tasks).find((t) => t.id === activeId) : undefined;

  // Selección múltiple (bloque 7.10-7.13): orden visual para `⇧clic`, todas
  // las columnas de izquierda a derecha, cada una de arriba a abajo — el
  // mismo orden en que se ven las tarjetas en pantalla.
  const selectionOrderIds = columns.flatMap((column) => column.tasks.map((t) => t.id));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const action = resolveDragEnd(columns, String(event.active.id), event.over ? String(event.over.id) : null);
    if (!action) return;
    if (action.type === "reorder") onReorderWithinColumn(action.columnId, action.taskId, action.position);
    else onMoveAcrossColumns(action.taskId, action.fromColumnId, action.toColumnId);
  }

  return (
    // `id` fijo (no el default autoincremental de `@dnd-kit`): sin esto, los
    // `aria-describedby`/`id` que arma internamente para las instrucciones de
    // accesibilidad dependen de cuántos `DndContext` ya se montaron en ese
    // proceso, y el conteo del server (un proceso Node de larga vida) diverge
    // del conteo del cliente (uno por carga de página) — hydration mismatch
    // diagnosticado en la fase 4 (grupo 6, tarea 6.1) al ponerle `id`
    // explícito a `components/calendar/calendar-view.tsx`; acá quedaba el
    // mismo riesgo latente desde la fase 2, descartado entonces como
    // artefacto de desarrollo sin serlo.
    <DndContext
      id="board-drag"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
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
                      <TaskRow
                        key={task.id}
                        task={task}
                        allTasks={allTasks}
                        siblings={[]}
                        depth={0}
                        variant="board"
                        showDragHandle
                        sortableData={{ columnId: column.id }}
                        selectionOrderIds={selectionOrderIds}
                      />
                    ))}
                  </ul>
                </SortableContext>
              ) : (
                <ul className="flex flex-col gap-1">
                  {column.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      allTasks={allTasks}
                      siblings={[]}
                      depth={0}
                      variant="board"
                      selectionOrderIds={selectionOrderIds}
                    />
                  ))}
                </ul>
              )}
              {column.tasks.length === 0 ? (
                <TaskListEmptyState
                  icon={Inbox}
                  title="Esta columna está vacía."
                  description="Las tareas que agregues o muevas para acá van a aparecer en este lugar."
                  action={renderColumnEmptyAction?.(column)}
                />
              ) : (
                renderColumnFooter?.(column)
              )}
            </ColumnDropZone>
          </div>
        ))}
      </div>
      <DragOverlay wrapperElement="ul" className="pointer-events-none">
        {activeTask ? (
          <TaskRow task={activeTask} allTasks={allTasks} siblings={[]} depth={0} variant="board" dragOverlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
