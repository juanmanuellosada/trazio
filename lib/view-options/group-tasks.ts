import { dateColumns } from "@/lib/board/panel-columns";
import { priorityLabel, TASK_PRIORITIES } from "@/lib/validation/tasks";
import type { LabelChip, TaskRow } from "@/lib/tasks/use-tasks";
import { effectiveListGroupBy, type GroupByOption } from "./schema";

export type TaskGroup<T> = { key: string; label: string; tasks: T[] };

/**
 * Aplica el control "agrupar por" de la barra de opciones (bloque 6.6,
 * requirement "Agrupar por, configurable", extendido por
 * `openspec/changes/lista-con-mas-agrupadores`). Con "nada" devuelve un
 * único grupo sin encabezado (`label: ""`), para que quien llama pueda
 * tratar agrupado y no agrupado con el mismo camino de render — esto es lo
 * que produce la "lista corrida" (D-A del design).
 *
 * "sección" nunca llega a agruparse acá: `effectiveListGroupBy` la trata
 * como "nada", porque arma bloques colapsables con sus propias acciones que
 * solo `SectionedTasks` sabe montar (D-C del design) — quien llama sigue
 * leyendo y escribiendo el valor crudo tal cual.
 *
 * "fecha" reusa `dateColumns` (`lib/board/panel-columns.ts`), el mismo
 * módulo que ya agrupa por fecha en el panel: un grupo por día con tareas,
 * en orden cronológico, más "Sin fecha" al final si hay alguna sin fecha
 * (a diferencia del panel, acá se descarta si queda vacío, mismo criterio
 * que "prioridad" y "etiqueta" un poco más abajo). `timezone` solo importa
 * para este caso — el resto de los agrupadores no depende de una zona
 * horaria — y por eso tiene un default: quien llama sin agrupar por fecha
 * nunca necesita pasarlo.
 *
 * "etiqueta": una tarea con más de una etiqueta aparece en cada uno de sus
 * grupos (igual trato que el resto de la app le da a una tarea
 * multi-etiquetada); las sin ninguna etiqueta se juntan aparte, al final
 * (requirement "las tareas sin ninguna etiqueta se agrupan aparte").
 */
export function groupTasks<T extends TaskRow>(tasks: T[], groupBy: GroupByOption, timezone = "UTC"): TaskGroup<T>[] {
  const effectiveGroupBy = effectiveListGroupBy(groupBy);
  if (effectiveGroupBy === "nada") return [{ key: "todas", label: "", tasks }];

  if (effectiveGroupBy === "fecha") {
    return dateColumns(tasks, timezone)
      .filter((column) => column.tasks.length > 0)
      .map((column) => ({ key: column.id, label: column.label, tasks: column.tasks }));
  }

  if (effectiveGroupBy === "prioridad") {
    return TASK_PRIORITIES.map((p) => ({
      key: String(p.value),
      label: priorityLabel(p.value),
      tasks: tasks.filter((t) => t.priority === p.value),
    })).filter((group) => group.tasks.length > 0);
  }

  const byLabel = new Map<string, TaskGroup<T>>();
  const withoutLabel: T[] = [];
  for (const task of tasks) {
    if (task.labels.length === 0) {
      withoutLabel.push(task);
      continue;
    }
    for (const label of task.labels as LabelChip[]) {
      const group = byLabel.get(label.id) ?? { key: label.id, label: label.name, tasks: [] };
      group.tasks.push(task);
      byLabel.set(label.id, group);
    }
  }

  const groups = [...byLabel.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
  if (withoutLabel.length > 0) groups.push({ key: "sin-etiqueta", label: "Sin etiqueta", tasks: withoutLabel });
  return groups;
}
