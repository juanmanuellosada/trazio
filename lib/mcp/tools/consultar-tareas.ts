import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { parseQuery } from "@/lib/query-language/parse";
import { describeQueryFields, QUERY_COMBINED_EXAMPLE } from "@/lib/query-language/field-reference";
import { buildPage, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, resolveOffset, resolvePageSize } from "../pagination";
import { MCP_TASK_COLUMNS, toMcpTaskItem, type McpTaskItem, type RawTaskRow } from "./shared";

/**
 * `consulta`, no `query` (D-H de `design.md`): ese texto no persiste en
 * ninguna columna, se parsea a AST y se descarta — distinto del `query` que
 * `crear`/`editar` van a aceptar para `tipo: filtro` en la Ola 7, que sí
 * corresponde uno a uno con `filters.query`.
 */
/**
 * `consulta` va sin `.min(1)` y `limite` sin `.int().positive()`: ambos
 * esquemas se limitan a la forma del dato (string, number) y dejan que
 * `parseQuery` y `resolvePageSize` — que ya saben qué hacer con una
 * consulta vacía o un límite fuera de rango, con mensaje en español —
 * sean quienes deciden. Un esquema más estricto acá rechaza esos valores
 * antes de llamar al handler, con el error de protocolo genérico en
 * inglés del SDK en vez del mensaje ya escrito para ese caso.
 */
const CONSULTA_DESCRIPTION =
  `Consulta en el lenguaje de filtros de Trazio, el mismo que usan el Buscador y los Filtros guardados. ` +
  `Campos: ${describeQueryFields()}. Operadores: & (y), | (o), ! (no), ( ) agrupa; una coma dentro de ` +
  `un campo es "o" entre esos valores (ej. priority:1,2). Si la consulta no menciona completed, las ` +
  `completadas quedan afuera. Ejemplos: "project:trabajo & priority:1,2 & due:overdue" (tareas de ` +
  `trabajo, prioridad 1 o 2, vencidas); "${QUERY_COMBINED_EXAMPLE}" (prioridad 1 o 2 con vencimiento en ` +
  `7 días, sin la etiqueta espera); "search:informe" (texto libre en título o descripción).`;

export const consultarTareasInputSchema = z.object({
  consulta: z.string().describe(CONSULTA_DESCRIPTION),
  cursor: z
    .string()
    .optional()
    .describe("Token de paginación: el next_cursor de la respuesta anterior. Omitir en la primera página."),
  limite: z
    .number()
    .optional()
    .describe(`Resultados por página, de 1 a ${MAX_PAGE_SIZE} (default ${DEFAULT_PAGE_SIZE}).`),
});
export type ConsultarTareasInput = z.infer<typeof consultarTareasInputSchema>;

export type ConsultarTareasResult =
  | { ok: true; tasks: McpTaskItem[]; truncated: boolean; next_cursor: string | null }
  | { ok: false; error: string };

/**
 * `consultar_tareas` (spec `mcp`, requirement homónimo; D-G de
 * `design.md`): reutiliza el mismo parser que el Buscador y los Filtros
 * guardados (`lib/query-language/parse.ts`, verificado puro y usable del
 * lado del servidor — no importa nada fuera de `zod` y de sí mismo) para
 * convertir `consulta` al AST que espera el RPC `buscar_tareas`. Nombre
 * distinto al del RPC a propósito: son capas distintas (acá además se
 * convierte cada `description` de jsonb a texto), no un alias.
 *
 * Paginada por `.order("id").range(...)` sobre el resultado del RPC — el
 * mismo mecanismo que una tabla común, porque `buscar_tareas` devuelve
 * `setof tasks` y PostgREST lo deja encadenar como cualquier `.select()`.
 * `id` como criterio de orden (no `position`, que D-F ya documenta sin
 * desempate único) es una elección deliberada de esta paginación: sin un
 * orden estable, avanzar de página en offset puede saltear o repetir filas.
 */
export async function consultarTareas(
  supabase: SupabaseClient<Database>,
  input: ConsultarTareasInput,
): Promise<ConsultarTareasResult> {
  const parsed = parseQuery(input.consulta);
  if (!parsed.ok) {
    return {
      ok: false,
      error: `${parsed.error.message} (posición ${parsed.error.position}, longitud ${parsed.error.length})`,
    };
  }

  const pageSize = resolvePageSize(input.limite);
  const offset = resolveOffset(input.cursor);

  const { data, error } = await supabase
    .rpc("buscar_tareas", { ast: parsed.ast })
    .select(MCP_TASK_COLUMNS)
    .order("id", { ascending: true })
    .range(offset, offset + pageSize);

  if (error) return { ok: false, error: error.message };

  const page = buildPage((data ?? []) as unknown as RawTaskRow[], offset, pageSize);
  return {
    ok: true,
    tasks: page.items.map(toMcpTaskItem),
    truncated: page.truncated,
    next_cursor: page.nextCursor,
  };
}
