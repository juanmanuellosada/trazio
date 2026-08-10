import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/lib/supabase/database.types";
import { parseQuery } from "@/lib/query-language/parse";

// Prefijos de tipo cortos a propósito ("[habito]" en vez de 'Solo tipo "habito":'):
// ver la nota de presupuesto en `tasks.md`, Ola 7.
export const crearInputSchema = z.object({
  tipo: z.string().describe("Tipo de entidad a crear: proyecto, habito, etiqueta o filtro. tarea no es válido acá: usar crear_tarea."),
  name: z.string().describe("Nombre visible de la entidad."),
  parent_id: z.string().optional().describe("[proyecto] Id del proyecto padre, para crear un subproyecto."),
  color: z.string().optional().describe("Color de la paleta de Trazio (ver listar_estructura). Requerido salvo en proyecto."),
  icon: z.string().optional().describe("[proyecto/filtro] Emoji del ícono."),
  duration_minutes: z.number().optional().describe("[habito, requerido] Duración estimada en minutos."),
  frequency_type: z.string().optional().describe("[habito, requerido] Frecuencia del hábito."),
  scheduled_time: z.string().optional().describe("[habito] Hora programada, HH:mm:ss."),
  times_per_week: z.number().optional().describe("[habito] Veces por semana, si la frecuencia es por cantidad."),
  days_of_week: z.array(z.number()).optional().describe("[habito] Días fijos, 0 (domingo) a 6 (sábado), si la frecuencia es por día."),
  query: z
    .string()
    .optional()
    .describe("[filtro, requerido] Consulta en el lenguaje de filtros (mismo lenguaje que consultar_tareas). Se valida antes de guardar."),
  position: z.unknown().optional().describe("No permitido: la base la asigna sola. Cualquier valor acá rechaza la llamada."),
});
export type CrearInput = z.infer<typeof crearInputSchema>;

export type CrearResult = { ok: true; id: string; tipo: string; name: string } | { ok: false; error: string };

/**
 * `crear` (spec `mcp`, D-G de `design.md`): discriminador `tipo` para las
 * cuatro entidades que no tienen la asimetría de firma de `crear_tarea`
 * (lenguaje natural) — proyecto, hábito, etiqueta, filtro, todas con campos
 * ya estructurados. Nunca `tipo: tarea` (existe `crear_tarea` para eso).
 * `position` se rechaza explícitamente para cualquier `tipo` (D-F: la base
 * la asigna sola vía trigger, ver `crear-tarea.ts`). Un filtro con `query`
 * inválida en el lenguaje de consulta se rechaza antes de guardar —
 * `parseQuery`, la misma función que valida `consultar_tareas`.
 */
export async function crear(supabase: SupabaseClient<Database>, input: CrearInput): Promise<CrearResult> {
  if ("position" in input) {
    return { ok: false, error: 'El campo "position" no está permitido: la base lo asigna sola.' };
  }
  if (input.tipo === "tarea") {
    return { ok: false, error: 'tipo: "tarea" no es válido acá: usar la herramienta crear_tarea.' };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return { ok: false, error: "No se pudo identificar al usuario del token." };
  const userId = userData.user.id;

  switch (input.tipo) {
    case "proyecto": {
      const payload: Omit<TablesInsert<"projects">, "position"> = {
        user_id: userId,
        name: input.name,
        parent_id: input.parent_id ?? null,
        color: input.color ?? null,
        icon: input.icon ?? null,
      };
      const { data, error } = await supabase
        .from("projects")
        .insert(payload as TablesInsert<"projects">)
        .select("id")
        .single();
      if (error) throw error;
      return { ok: true, id: data.id, tipo: input.tipo, name: input.name };
    }

    case "habito": {
      if (!input.color || !input.icon || input.duration_minutes == null || !input.frequency_type) {
        return {
          ok: false,
          error: 'Faltan campos requeridos para tipo "habito": color, icon, duration_minutes y frequency_type son obligatorios.',
        };
      }
      const { data, error } = await supabase
        .from("habits")
        .insert({
          user_id: userId,
          name: input.name,
          color: input.color,
          icon: input.icon,
          duration_minutes: input.duration_minutes,
          frequency_type: input.frequency_type,
          scheduled_time: input.scheduled_time ?? null,
          times_per_week: input.times_per_week ?? null,
          days_of_week: input.days_of_week ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { ok: true, id: data.id, tipo: input.tipo, name: input.name };
    }

    case "etiqueta": {
      if (!input.color) return { ok: false, error: 'Falta "color", requerido para tipo "etiqueta".' };
      const { data, error } = await supabase
        .from("labels")
        .insert({ user_id: userId, name: input.name, color: input.color })
        .select("id")
        .single();
      if (error) throw error;
      return { ok: true, id: data.id, tipo: input.tipo, name: input.name };
    }

    case "filtro": {
      if (!input.color) return { ok: false, error: 'Falta "color", requerido para tipo "filtro".' };
      if (!input.query) return { ok: false, error: 'Falta "query", requerido para tipo "filtro".' };
      const parsed = parseQuery(input.query);
      if (!parsed.ok) {
        return {
          ok: false,
          error: `${parsed.error.message} (posición ${parsed.error.position}, longitud ${parsed.error.length})`,
        };
      }
      const { data, error } = await supabase
        .from("filters")
        .insert({ user_id: userId, name: input.name, color: input.color, query: input.query, icon: input.icon ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return { ok: true, id: data.id, tipo: input.tipo, name: input.name };
    }

    default:
      return { ok: false, error: `tipo "${input.tipo}" no es válido: usar "proyecto", "habito", "etiqueta" o "filtro".` };
  }
}
