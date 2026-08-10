import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { MCP_TASK_COLUMNS, invalidUuidError, isValidUuid, toMcpTaskItem, type McpTaskItem, type RawTaskRow } from "./shared";

/**
 * `id` va como `z.string()` a secas, sin `.uuid()` acá: el formato se valida
 * dentro de `obtenerTarea` (ver más abajo) para poder devolver un mensaje en
 * español por el mismo canal `{ ok: false, error }` que el resto de las
 * herramientas, en vez del error de protocolo en inglés que produce el SDK
 * cuando el esquema de entrada rechaza el argumento antes de llamar al
 * handler.
 */
export const obtenerTareaInputSchema = z.object({
  id: z
    .string()
    .describe("UUID de la tarea, obtenido de un resultado previo de consultar_tareas (o del campo subtasks de otra tarea)."),
});
export type ObtenerTareaInput = z.infer<typeof obtenerTareaInputSchema>;

export type McpTaskDetail = McpTaskItem & {
  created_at: string;
  recurrence_rule: string | null;
  recurrence_ends_at: string | null;
  recurrence_count: number | null;
  recurrence_anchor: string | null;
  subtasks: McpTaskItem[];
};

type RawTaskDetailRow = RawTaskRow & {
  created_at: string;
  recurrence_rule: string | null;
  recurrence_ends_at: string | null;
  recurrence_count: number | null;
  recurrence_anchor: string | null;
};

const TASK_DETAIL_COLUMNS = `${MCP_TASK_COLUMNS}, created_at, recurrence_rule, recurrence_ends_at, recurrence_count, recurrence_anchor`;

export type ObtenerTareaResult = { ok: true; task: McpTaskDetail } | { ok: false; error: string };

/**
 * `obtener_tarea` (spec `mcp`): detalle completo por id, subtareas y
 * etiquetas incluidas, sin comentarios ni recordatorios (fuera del alcance
 * de lectura del MCP). Sin `.eq("user_id", ...)` explícito en ninguna de
 * las dos consultas: RLS ya acota a la cuenta del token (`.claude/rules/
 * database.md`), mismo criterio que `lib/tasks/use-task.ts` — un id de otra
 * cuenta no encuentra fila, ni la tarea ni sus subtareas.
 *
 * `id` con formato inválido nunca llega a tocar la base: un modelo de
 * lenguaje inventa ids fuera de formato como parte normal de su uso, y
 * dejar que ese valor llegue crudo a Postgres devuelve un error de
 * conversión de tipo (`invalid input syntax for type uuid`) que filtra
 * jerga de base de datos hacia el cliente MCP.
 */
export async function obtenerTarea(
  supabase: SupabaseClient<Database>,
  input: ObtenerTareaInput,
): Promise<ObtenerTareaResult> {
  if (!isValidUuid(input.id)) {
    return { ok: false, error: invalidUuidError(input.id) };
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .select(TASK_DETAIL_COLUMNS)
    .eq("id", input.id)
    .maybeSingle();
  if (error) throw error;
  if (!task) return { ok: false, error: "No se encontró una tarea con ese id." };

  const { data: subtaskRows, error: subtaskError } = await supabase
    .from("tasks")
    .select(MCP_TASK_COLUMNS)
    .eq("parent_id", input.id)
    .order("position", { ascending: true });
  if (subtaskError) throw subtaskError;

  const row = task as unknown as RawTaskDetailRow;
  const base = toMcpTaskItem(row);

  return {
    ok: true,
    task: {
      ...base,
      created_at: row.created_at,
      recurrence_rule: row.recurrence_rule,
      recurrence_ends_at: row.recurrence_ends_at,
      recurrence_count: row.recurrence_count,
      recurrence_anchor: row.recurrence_anchor,
      subtasks: ((subtaskRows ?? []) as unknown as RawTaskRow[]).map(toMcpTaskItem),
    },
  };
}
