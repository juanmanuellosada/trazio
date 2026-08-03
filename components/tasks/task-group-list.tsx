"use client";

import { groupTasks } from "@/lib/view-options/group-tasks";
import type { GroupByOption } from "@/lib/view-options/schema";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { TaskRow } from "./task-row";

/**
 * Aplica "agrupar por" (bloque 6.6) dentro de un bloque que ya tiene su
 * propio significado fijo (Atrasadas, Hoy, o un día de Próximos): la
 * agrupación no reemplaza esos bloques, los subdivide. Con `groupBy: "nada"`
 * (el caso más común) no agrega ningún encabezado — mismo resultado visual
 * que antes de esta capacidad.
 *
 * Selección múltiple (bloque 7.10-7.13): el orden visual para `⇧clic`
 * (`selectionOrderIds`) se calcula acá mismo, aplanando los grupos ya
 * armados — así Hoy y Próximos (los dos llamadores de este componente) no
 * tienen que recalcular la misma agrupación solo para saber el orden.
 */
export function TaskGroupList({
  tasks,
  allTasks,
  groupBy,
  showProject,
}: {
  tasks: TaskRowData[];
  allTasks: TaskRowData[];
  groupBy: GroupByOption;
  /** Decisión explícita de la pantalla que llama (`fila-de-tarea-en-niveles`, D-B): Hoy y Próximos, los dos únicos llamadores, la pasan en `true`. */
  showProject: boolean;
}) {
  const groups = groupTasks(tasks, groupBy);
  const orderedIds = groups.flatMap((group) => group.tasks.map((t) => t.id));

  return (
    <>
      {groups.map((group) => (
        <div key={group.key} className={group.label ? "mt-3 first:mt-0" : undefined}>
          {group.label && (
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-text-secondary uppercase">
              {group.label} <span className="font-normal normal-case tracking-normal">({group.tasks.length})</span>
            </h3>
          )}
          <ul className="flex flex-col divide-y divide-border/60">
            {group.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                allTasks={allTasks}
                siblings={[]}
                depth={0}
                variant="flat"
                selectionOrderIds={orderedIds}
                showProject={showProject}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
