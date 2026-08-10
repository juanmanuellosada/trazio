import type { Json } from "@/lib/supabase/database.types";
import { tiptapDocToMarkdown } from "@/lib/markdown/tiptap-to-markdown";

/**
 * Forma de una tarea para las herramientas de lectura del MCP
 * (`consultar_tareas`, `obtener_tarea`): mismo criterio de columnas que
 * `lib/tasks/task-columns.ts` y `lib/tasks/use-task.ts`, pero con
 * `description` siempre incluida y ya convertida a texto (D-D de
 * `design.md`, requirement "La descripción llega como texto, no como
 * jsonb"). Los nombres de campo van en inglés, uno a uno con la columna de
 * la base (D-H de `design.md`): la superficie del MCP que va en español es
 * el nombre de la herramienta y sus parámetros propios, no la forma de los
 * datos que ya existen en el resto del repo con estos mismos nombres.
 */
export type McpLabel = { id: string; name: string; color: string };

export type McpTaskItem = {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  priority: number;
  due_date: string | null;
  due_at: string | null;
  duration_minutes: number | null;
  deadline: string | null;
  completed_at: string | null;
  position: number;
  labels: McpLabel[];
};

export type RawTaskRow = {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  title: string;
  description: Json | null;
  priority: number;
  due_date: string | null;
  due_at: string | null;
  duration_minutes: number | null;
  deadline: string | null;
  completed_at: string | null;
  position: number;
  task_labels: { labels: McpLabel | null }[] | null;
};

export const MCP_TASK_COLUMNS =
  "id, project_id, section_id, parent_id, title, description, priority, due_date, due_at, duration_minutes, deadline, completed_at, position, task_labels(labels(id, name, color))";

export function toMcpTaskItem(row: RawTaskRow): McpTaskItem {
  const { task_labels, description, ...rest } = row;
  const text = tiptapDocToMarkdown(description);
  return {
    ...rest,
    description: text === "" ? null : text,
    labels: (task_labels ?? []).map((t) => t.labels).filter((l): l is McpLabel => l != null),
  };
}
