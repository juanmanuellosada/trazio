import type { ProjectColor } from "@/lib/validation/colors";

/** Etiqueta tal como se muestra en un chip (lista o detalle), sin más columnas que las que se usan. */
export type LabelChip = { id: string; name: string; color: ProjectColor };

/**
 * Fila de tarea para las vistas de lista (bloque 7): sin `description` (es
 * jsonb, pesada, y solo hace falta en el detalle — ver `use-task.ts`) y sin
 * `select('*')`. Las etiquetas vienen en el mismo viaje por el join anidado
 * de PostgREST (`task_labels(labels(...))`): traer las etiquetas tarea por
 * tarea sería el N+1 que prohíbe `.claude/rules/database.md`.
 */
export type TaskRow = {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  title: string;
  priority: number;
  due_date: string | null;
  due_at: string | null;
  duration_minutes: number | null;
  deadline: string | null;
  completed_at: string | null;
  position: number;
  labels: LabelChip[];
};

/**
 * Columnas y tipos de las vistas de lista, en un módulo sin `"use client"`:
 * `TASK_LIST_COLUMNS` y `toTaskRow` los usan tanto los hooks del cliente
 * (`use-tasks.ts` y afines) como los `get-*.ts` que siembran el caché desde
 * el Server Component. Un módulo con `"use client"` convierte sus exports en
 * client references cuando se importan desde código de servidor, así que
 * `TASK_LIST_COLUMNS` dejaba de ser el string que espera `.select()`.
 */
export const TASK_LIST_COLUMNS =
  "id, project_id, section_id, parent_id, title, priority, due_date, due_at, duration_minutes, deadline, completed_at, position, task_labels(labels(id, name, color))";

export type TaskListRawRow = Omit<TaskRow, "labels"> & {
  task_labels: { labels: LabelChip | null }[] | null;
};

export function toTaskRow(row: TaskListRawRow): TaskRow {
  const { task_labels, ...rest } = row;
  return { ...rest, labels: (task_labels ?? []).map((t) => t.labels).filter((l): l is LabelChip => l != null) };
}
