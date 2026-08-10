import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
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

/**
 * Forma genérica de un UUID (cualquier versión/variante): lo que Postgres
 * acepta para una columna `id`, sin tocar la base para saberlo. Extraído a
 * este módulo en la Ola 7 (`servidor-mcp`): las cinco herramientas de
 * escritura reciben un `id` de entidad igual que ya hacía `obtener_tarea`
 * en la Ola 6, y todas necesitan el mismo chequeo antes de tocar la base —
 * un id con formato inválido nunca debe llegar a Postgres, que devolvería
 * `invalid input syntax for type uuid`, jerga de base de datos que no le
 * sirve al modelo para corregir su llamada.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function invalidUuidError(id: string): string {
  return `El id "${id}" no tiene el formato de un UUID válido, por ejemplo "3fa85f64-5717-4562-b3fc-2c963f66afa6".`;
}

/**
 * Confirma que una fila con ese `id` existe y es visible bajo RLS (misma
 * cuenta del token) antes de editarla/archivarla — sin este chequeo, un id
 * ajeno o inexistente hace que `.update().eq("id", id)` no toque ninguna
 * fila mientras la política de RLS lo deja pasar sin error, y la
 * herramienta terminaría contestando éxito por una escritura que en
 * realidad no aplicó a nada.
 */
export async function entityExists(
  supabase: SupabaseClient<Database>,
  table: "tasks" | "projects" | "habits" | "labels" | "filters",
  id: string,
): Promise<boolean> {
  const { data, error } = await supabase.from(table).select("id").eq("id", id).maybeSingle();
  if (error) throw error;
  return data != null;
}
