import type { CallToolResult, McpServer, ServerContext } from "@modelcontextprotocol/server";
import { createMcpSupabaseClient } from "./client";
import { consultarTareas, consultarTareasInputSchema } from "./tools/consultar-tareas";
import { listarEstructura, listarEstructuraInputSchema } from "./tools/listar-estructura";
import { listarHabitos, listarHabitosInputSchema } from "./tools/listar-habitos";
import { obtenerTarea, obtenerTareaInputSchema } from "./tools/obtener-tarea";

function textResult(value: unknown, isError = false): CallToolResult {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return { content: [{ type: "text", text }], isError };
}

/**
 * `withMcpAuth` (`app/api/mcp/route.ts`) ya rechaza con 401 cualquier
 * pedido sin token válido antes de que un handler de herramienta corra —
 * esto es una red de seguridad defensiva, no el camino esperado (spec
 * `mcp`, requirement "Sin token válido, ninguna herramienta responde").
 */
function requireAccessToken(ctx: ServerContext): string | null {
  return ctx.http?.authInfo?.token ?? null;
}

/**
 * Arma el servidor MCP de Trazio: registra las cuatro herramientas de
 * lectura de la Ola 6 (spec `mcp`, D-G/D-H de `design.md`). Cada
 * herramienta arma su propio cliente de Supabase con el token del pedido
 * — nunca la `service_role` — para que RLS aplique igual que en la app
 * (D-A de `design.md`, requirement "Toda herramienta del MCP opera bajo el
 * token OAuth del usuario conectado").
 */
export function initializeMcpServer(server: McpServer): void {
  server.registerTool(
    "consultar_tareas",
    {
      title: "Consultar tareas",
      description:
        "Busca tareas con el lenguaje de consulta de Trazio (ver el parámetro consulta): cubre Bandeja, " +
        "Hoy, Próximos, Proyecto, Etiqueta, Filtro y Buscador en una sola herramienta. Pagina resultados " +
        "grandes: si la respuesta trae truncated:true, repetir la llamada con cursor = next_cursor — no " +
        "asumir que son todos los resultados que hay. Para el detalle completo de una tarea puntual ya " +
        "identificada (subtareas, recurrencia), usar obtener_tarea en cambio.",
      inputSchema: consultarTareasInputSchema,
    },
    async (args, ctx) => {
      const token = requireAccessToken(ctx);
      if (!token) return textResult("No autenticado: falta el access token.", true);

      const result = await consultarTareas(createMcpSupabaseClient(token), args);
      if (!result.ok) return textResult(result.error, true);
      return textResult({ tasks: result.tasks, truncated: result.truncated, next_cursor: result.next_cursor });
    },
  );

  server.registerTool(
    "obtener_tarea",
    {
      title: "Obtener tarea",
      description:
        "Detalle completo de una tarea por id: sus campos, sus subtareas y sus etiquetas. Nunca incluye " +
        "comentarios ni recordatorios: quedan fuera del alcance de lectura del MCP. Requiere conocer el " +
        "id de antemano (de un resultado de consultar_tareas); para buscar o listar tareas por criterio, " +
        "usar consultar_tareas en cambio.",
      inputSchema: obtenerTareaInputSchema,
    },
    async (args, ctx) => {
      const token = requireAccessToken(ctx);
      if (!token) return textResult("No autenticado: falta el access token.", true);

      const result = await obtenerTarea(createMcpSupabaseClient(token), args);
      if (!result.ok) return textResult(result.error, true);
      return textResult(result.task);
    },
  );

  server.registerTool(
    "listar_estructura",
    {
      title: "Listar estructura",
      description:
        "Árbol de proyectos (con sus subproyectos y sus secciones), etiquetas y filtros guardados de la " +
        "cuenta, en una sola llamada — el mapa de la cuenta antes de crear o filtrar algo. Los nombres que " +
        "devuelve son los que consultar_tareas espera en su lenguaje de consulta (project:, section:, " +
        "label:). No devuelve tareas. Pagina proyectos en cuentas grandes: si truncated:true, repetir con " +
        "cursor = next_cursor.",
      inputSchema: listarEstructuraInputSchema,
    },
    async (args, ctx) => {
      const token = requireAccessToken(ctx);
      if (!token) return textResult("No autenticado: falta el access token.", true);

      const result = await listarEstructura(createMcpSupabaseClient(token), args);
      return textResult(result);
    },
  );

  server.registerTool(
    "listar_habitos",
    {
      title: "Listar hábitos",
      description:
        "Hábitos de la cuenta con su estado del día (pending, done o skipped), su racha actual y su mejor " +
        "racha. Constancia y repeticiones todavía no están disponibles: dependen del change " +
        "metricas-de-habitos, propuesto y sin implementar.",
      inputSchema: listarHabitosInputSchema,
    },
    async (args, ctx) => {
      const token = requireAccessToken(ctx);
      if (!token) return textResult("No autenticado: falta el access token.", true);

      const result = await listarHabitos(createMcpSupabaseClient(token), args);
      return textResult(result);
    },
  );
}
