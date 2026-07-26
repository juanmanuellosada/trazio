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
 */
export function TaskList({
  projectId,
  sectionId,
  parentId,
  initialTasks,
  depth = 0,
  emptyState,
}: {
  projectId: string;
  sectionId: string | null;
  parentId: string | null;
  initialTasks?: TaskRowData[];
  depth?: number;
  /** Reemplaza el mensaje vacío por defecto (bloque 8.6: cada vista explica qué va a aparecer ahí, no un genérico). Solo se usa en el nivel superior (`depth === 0`). */
  emptyState?: ReactNode;
}) {
  const { data } = useTasks(projectId, initialTasks);
  const moveTask = useMoveTask();
  const allTasks = data ?? [];
  const tasks = siblingsOfTask(allTasks, { projectId, sectionId, parentId });

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
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col">
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} allTasks={allTasks} siblings={tasks} depth={depth} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <div style={{ paddingLeft: depth * 24 }}>
        <TaskQuickAddRow projectId={projectId} sectionId={sectionId} parentId={parentId} />
      </div>
    </div>
  );
}
