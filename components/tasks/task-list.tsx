"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMoveTask } from "@/lib/tasks/mutations";
import { positionForIndex, siblingsOfTask } from "@/lib/tasks/tree";
import { useTasks, type TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { applyQuickFilters } from "@/lib/view-options/filter-tasks";
import { orderTasks } from "@/lib/view-options/order-tasks";
import type { OrderOption, QuickFilters } from "@/lib/view-options/schema";
import { TaskQuickAddRow } from "./task-quick-add-row";
import { TaskRow } from "./task-row";

/**
 * Lista de tareas de un contexto (misma sección, o mismas subtareas de un
 * padre — bloque 7.8): reordenar por arrastre, con el camino alternativo
 * por menú que ya trae cada `TaskRow` (`.claude/rules/frontend.md`). Se usa
 * tanto para el nivel superior de un proyecto/sección como, recursivamente,
 * para las subtareas de cada tarea (`TaskRow` renderiza esta misma lista
 * para sus hijos) y para la sección "Subtareas" del panel de detalle.
 *
 * Arma el árbol en memoria a partir de una sola consulta por proyecto
 * (`useTasks`, que trae *todas* las tareas del proyecto sin importar
 * sección ni nivel): nada de una consulta por nivel de anidamiento.
 *
 * `order`/`quickFilters`/`showCompleted` (bloque 6.6, barra de opciones de
 * vista): solo los pasa el nivel superior (`SectionedTasks`), nunca la
 * recursión de subtareas — una subtarea siempre se ve y se ordena igual
 * que antes de esta capacidad, sin importar la opción de la vista que la
 * contiene. `siblings` (para "mover arriba/abajo" del menú) siempre viaja
 * en orden de `position`, aunque la lista se esté mostrando en otro orden,
 * para que ese menú siga moviendo la `position` real.
 */
export function TaskList({
  projectId,
  sectionId,
  parentId,
  initialTasks,
  depth = 0,
  emptyState,
  order = "manual",
  quickFilters,
  showCompleted = true,
  timezone = "UTC",
  selectionOrderIds,
}: {
  projectId: string;
  sectionId: string | null;
  parentId: string | null;
  initialTasks?: TaskRowData[];
  depth?: number;
  /** Reemplaza el mensaje vacío por defecto (bloque 8.6: cada vista explica qué va a aparecer ahí, no un genérico). Solo se usa en el nivel superior (`depth === 0`). */
  emptyState?: ReactNode;
  order?: OrderOption;
  quickFilters?: QuickFilters;
  showCompleted?: boolean;
  timezone?: string;
  /** Orden visual de selección múltiple (bloque 7.10-7.13): solo lo pasa quien monta el nivel superior (`SectionedTasks`), nunca la recursión de subtareas (ver el mismo criterio que `order`/`quickFilters` un poco más arriba) — así el casillero de selección nunca aparece en una subtarea. */
  selectionOrderIds?: string[];
}) {
  const { data } = useTasks(projectId, initialTasks);
  const moveTask = useMoveTask();
  const allTasks = data ?? [];
  const rawSiblings = siblingsOfTask(allTasks, { projectId, sectionId, parentId });
  const filtered = quickFilters ? applyQuickFilters(rawSiblings, quickFilters, showCompleted) : rawSiblings;
  const tasks = orderTasks(filtered, order, timezone);
  // Por D-I (bloque 6.10), el arrastre solo está habilitado con orden manual
  // y sin agrupación activa — la agrupación la resuelve `SectionedTasks`
  // antes de llegar acá (con agrupación, no se monta este componente).
  const dragEnabled = order === "manual";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = tasks.findIndex((t) => t.id === active.id);
    const overIndex = tasks.findIndex((t) => t.id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;

    const reordered = arrayMove(tasks, activeIndex, overIndex);
    const newIndex = reordered.findIndex((t) => t.id === active.id);
    const others = tasks.filter((t) => t.id !== active.id).map((t) => t.position);

    moveTask.mutate({
      id: active.id as string,
      fromProjectId: projectId,
      toProjectId: projectId,
      sectionId,
      parentId,
      position: positionForIndex(others, newIndex),
    });
  }

  return (
    <div>
      {tasks.length === 0 ? (
        depth === 0 && (emptyState ?? <p className="py-1 text-sm text-text-secondary">No hay tareas acá todavía.</p>)
      ) : dragEnabled ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  allTasks={allTasks}
                  siblings={rawSiblings}
                  depth={depth}
                  selectionOrderIds={selectionOrderIds}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <ul className="flex flex-col">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              allTasks={allTasks}
              siblings={rawSiblings}
              depth={depth}
              showDragHandle={false}
              selectionOrderIds={selectionOrderIds}
            />
          ))}
        </ul>
      )}
      <div style={{ paddingLeft: depth * 24 }}>
        <TaskQuickAddRow projectId={projectId} sectionId={sectionId} parentId={parentId} />
      </div>
    </div>
  );
}
