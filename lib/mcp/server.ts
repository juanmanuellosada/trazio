import type { CallToolResult, McpServer, ServerContext } from "@modelcontextprotocol/server";
import { createMcpSupabaseClient } from "./client";
import { archivar, archivarInputSchema } from "./tools/archivar";
import { completarTarea, completarTareaInputSchema } from "./tools/completar-tarea";
import { consultarTareas, consultarTareasInputSchema } from "./tools/consultar-tareas";
import { crear, crearInputSchema } from "./tools/crear";
import { crearTarea, crearTareaInputSchema } from "./tools/crear-tarea";
import { editar, editarInputSchema } from "./tools/editar";
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
 * lectura de la Ola 6 y las cinco de escritura de la Ola 7 (spec `mcp`,
 * D-G/D-H de `design.md`) — nueve en total, ninguna de borrado (requirement
 * "El servidor MCP nunca ofrece borrar"). Cada herramienta arma su propio
 * cliente de Supabase con el token del pedido — nunca la `service_role` —
 * para que RLS aplique igual que en la app (D-A de `design.md`, requirement
 * "Toda herramienta del MCP opera bajo el token OAuth del usuario
 * conectado").
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

  server.registerTool(
    "crear_tarea",
    {
      title: "Crear tarea",
      description:
        "Crea una tarea a partir de un texto en lenguaje natural (ver texto): reconoce fecha, hora, " +
        "prioridad, etiquetas y proyecto igual que el alta rápida de la app. Para lo que el texto no " +
        "exprese, usar project_id/section_id/parent_id. Nunca acepta position: la base la asigna sola. Es " +
        "la única herramienta de escritura que recibe lenguaje natural — para crear proyectos, hábitos, " +
        "etiquetas o filtros usar crear.",
      inputSchema: crearTareaInputSchema,
    },
    async (args, ctx) => {
      const token = requireAccessToken(ctx);
      if (!token) return textResult("No autenticado: falta el access token.", true);

      const result = await crearTarea(createMcpSupabaseClient(token), args);
      if (!result.ok) return textResult(result.error, true);
      return textResult(result.task);
    },
  );

  server.registerTool(
    "crear",
    {
      title: "Crear",
      description:
        "Crea un proyecto, hábito, etiqueta o filtro (ver tipo). Nunca tipo: tarea — usar crear_tarea en su " +
        'lugar. En proyecto, la base asigna position sola (nunca mandarla). Un filtro con "query" inválida ' +
        "en el lenguaje de consulta se rechaza antes de guardar.",
      inputSchema: crearInputSchema,
    },
    async (args, ctx) => {
      const token = requireAccessToken(ctx);
      if (!token) return textResult("No autenticado: falta el access token.", true);

      const result = await crear(createMcpSupabaseClient(token), args);
      if (!result.ok) return textResult(result.error, true);
      return textResult({ id: result.id, tipo: result.tipo, name: result.name });
    },
  );

  server.registerTool(
    "editar",
    {
      title: "Editar",
      description:
        "Edita una tarea, proyecto, hábito, etiqueta o filtro ya existente (tipo + id, de una lectura " +
        "previa) cambiando solo los campos que se manden. Nunca acepta completed_at (usar completar_tarea) " +
        "ni position (la asigna la base) — cualquiera de los dos rechaza la llamada entera. En tarea, " +
        "labels reemplaza el conjunto completo de etiquetas, no lo suma.",
      inputSchema: editarInputSchema,
    },
    async (args, ctx) => {
      const token = requireAccessToken(ctx);
      if (!token) return textResult("No autenticado: falta el access token.", true);

      const result = await editar(createMcpSupabaseClient(token), args);
      if (!result.ok) return textResult(result.error, true);
      return textResult("Editado.");
    },
  );

  server.registerTool(
    "completar_tarea",
    {
      title: "Completar tarea",
      description:
        "Completa o descompleta una tarea (id, de una lectura previa) con completado. Al completar una " +
        "tarea con recurrence_rule, crea automáticamente la siguiente ocurrencia de la serie — nunca usar " +
        "editar para completar, pierde ese efecto. Al descompletar, ningún efecto lateral.",
      inputSchema: completarTareaInputSchema,
    },
    async (args, ctx) => {
      const token = requireAccessToken(ctx);
      if (!token) return textResult("No autenticado: falta el access token.", true);

      const result = await completarTarea(createMcpSupabaseClient(token), args);
      if (!result.ok) return textResult(result.error, true);
      return textResult({ completado: args.completado, next_occurrence_id: result.next_occurrence_id });
    },
  );

  server.registerTool(
    "archivar",
    {
      title: "Archivar",
      description:
        "Archiva un proyecto o hábito (tipo + id, de una lectura previa). Es la única forma de baja que " +
        "ofrece el MCP: nunca borra, y no existe un tipo para desarchivar.",
      inputSchema: archivarInputSchema,
    },
    async (args, ctx) => {
      const token = requireAccessToken(ctx);
      if (!token) return textResult("No autenticado: falta el access token.", true);

      const result = await archivar(createMcpSupabaseClient(token), args);
      if (!result.ok) return textResult(result.error, true);
      return textResult("Archivado.");
    },
  );
}
