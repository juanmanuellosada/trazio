import { priorityLabel, TASK_PRIORITIES } from "@/lib/validation/tasks";
import type { LabelChip, TaskRow } from "@/lib/tasks/use-tasks";
import type { GroupByOption } from "./schema";

export type TaskGroup<T> = { key: string; label: string; tasks: T[] };

/**
 * Aplica el control "agrupar por" de la barra de opciones (bloque 6.6,
 * requirement "Agrupar por, configurable"). Con "nada" devuelve un único
 * grupo sin encabezado (`label: ""`), para que quien llama pueda tratar
 * agrupado y no agrupado con el mismo camino de render.
 *
 * "etiqueta": una tarea con más de una etiqueta aparece en cada uno de sus
 * grupos (igual trato que el resto de la app le da a una tarea
 * multi-etiquetada); las sin ninguna etiqueta se juntan aparte, al final
 * (requirement "las tareas sin ninguna etiqueta se agrupan aparte").
 */
export function groupTasks<T extends TaskRow>(tasks: T[], groupBy: GroupByOption): TaskGroup<T>[] {
  if (groupBy === "nada") return [{ key: "todas", label: "", tasks }];

  if (groupBy === "prioridad") {
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
