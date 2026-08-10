import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesUpdate } from "@/lib/supabase/database.types";
import { parseQuery } from "@/lib/query-language/parse";
import { DESCRIPTION_PARAM_DESCRIPTION, validateDescription } from "./description";
import { entityExists, invalidUuidError, isValidUuid } from "./shared";

// Prefijos de tipo cortos a propósito ("[tarea]" en vez de 'Solo tipo "tarea":'):
// nueve herramientas viajan en cada pedido y `editar` sola cubre cinco entidades,
// así que la prosa repetida por campo pesa — ver la nota de presupuesto en `tasks.md`.
export const editarInputSchema = z.object({
  tipo: z.string().describe('Tipo de la entidad a editar: tarea, proyecto, habito, etiqueta o filtro.'),
  id: z.string().describe("Id de la entidad, de una lectura previa (consultar_tareas, obtener_tarea, listar_estructura o listar_habitos)."),
  // tarea
  title: z.string().optional().describe("[tarea] Nuevo título."),
  description: z.unknown().optional().describe(`[tarea] ${DESCRIPTION_PARAM_DESCRIPTION}`),
  priority: z.number().optional().describe("[tarea] Prioridad, 1 (Urgente) a 4 (Baja)."),
  due_date: z.string().nullable().optional().describe("[tarea] Fecha sin hora, yyyy-MM-dd. Excluyente con due_at."),
  due_at: z.string().nullable().optional().describe("[tarea] Fecha y hora, instante ISO 8601. Excluyente con due_date."),
  duration_minutes: z.number().nullable().optional().describe("[tarea/habito] Duración estimada en minutos."),
  deadline: z.string().nullable().optional().describe("[tarea] Fecha límite, yyyy-MM-dd."),
  project_id: z.string().optional().describe("[tarea] Mueve la tarea a otro proyecto."),
  section_id: z.string().nullable().optional().describe("[tarea] Mueve la tarea a otra sección (null: ninguna)."),
  parent_id: z.string().nullable().optional().describe("[tarea] Cambia la tarea padre (null: la saca de una subtarea)."),
  recurrence_rule: z.string().nullable().optional().describe("[tarea] Regla RRULE, o null para quitar la recurrencia."),
  recurrence_ends_at: z.string().nullable().optional().describe("[tarea] Fin de la serie recurrente."),
  recurrence_count: z.number().nullable().optional().describe("[tarea] Ocurrencias restantes de la serie."),
  recurrence_anchor: z.string().nullable().optional().describe("[tarea] Ancla de la recurrencia."),
  labels: z
    .array(z.string())
    .optional()
    .describe("[tarea] Reemplaza el conjunto completo de etiquetas (ids), no incremental — igual que en el detalle."),
  // proyecto / habito / etiqueta / filtro
  name: z.string().optional().describe("[proyecto/habito/etiqueta/filtro] Nuevo nombre."),
  color: z.string().optional().describe("[proyecto/habito/etiqueta/filtro] Nuevo color de la paleta."),
  icon: z.string().optional().describe("[proyecto/filtro] Nuevo ícono (emoji)."),
  // habito
  scheduled_time: z.string().nullable().optional().describe("[habito] Hora programada, HH:mm:ss."),
  frequency_type: z.string().optional().describe("[habito] Frecuencia."),
  times_per_week: z.number().nullable().optional().describe("[habito] Veces por semana."),
  days_of_week: z.array(z.number()).nullable().optional().describe("[habito] Días fijos, 0 (domingo) a 6 (sábado)."),
  // filtro
  query: z.string().optional().describe("[filtro] Consulta en el lenguaje de filtros. Se valida antes de guardar."),
  // prohibidos, rechazo explícito (D-G/D-F de design.md)
  completed_at: z.unknown().optional().describe("No permitido: usar completar_tarea. Cualquier valor acá rechaza la llamada."),
  position: z.unknown().optional().describe("No permitido: la base la asigna sola. Cualquier valor acá rechaza la llamada."),
});
export type EditarInput = z.infer<typeof editarInputSchema>;

export type EditarResult = { ok: true } | { ok: false; error: string };

const TASK_PATCH_KEYS = [
  "title",
  "description",
  "priority",
  "due_date",
  "due_at",
  "duration_minutes",
  "deadline",
  "project_id",
  "section_id",
  "parent_id",
  "recurrence_rule",
  "recurrence_ends_at",
  "recurrence_count",
  "recurrence_anchor",
] as const;
const PROJECT_PATCH_KEYS = ["name", "parent_id", "color", "icon"] as const;
const HABIT_PATCH_KEYS = ["name", "color", "icon", "duration_minutes", "scheduled_time", "frequency_type", "times_per_week", "days_of_week"] as const;
const LABEL_PATCH_KEYS = ["name", "color"] as const;
const FILTER_PATCH_KEYS = ["name", "query", "color", "icon"] as const;

function pick(input: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in input) patch[key] = input[key];
  }
  return patch;
}

/**
 * `editar` (spec `mcp`, D-G de `design.md`): parche de campos estructurados
 * para cualquiera de las cinco entidades, `tarea` incluida — a diferencia de
 * `crear`, sí acepta `tipo: tarea`, porque editar nunca recibe lenguaje
 * natural. `completed_at` y `position` se rechazan de forma explícita
 * (declarados en el `inputSchema` para que el modelo los vea, y chequeados
 * acá antes de tocar la base) — completar es `completar_tarea`, y `position`
 * la asigna la base (D-F).
 *
 * Etiquetas de una tarea: reemplaza todo el conjunto (`task_labels`), nunca
 * incremental — mismo criterio que `useReplaceTaskLabels`
 * (`lib/tasks/mutations.ts`). Borrar filas de `task_labels` está permitido a
 * propósito para un token OAuth: es la única tabla que la migración de RLS
 * de la Ola 4 (`20260810010000_oauth_client_delete_restrictions.sql`) dejó
 * sin bloquear, porque quitar una etiqueta es editar la tarea, no borrarla.
 *
 * `description` (tipo: tarea) pasa por el mismo validador que `crear_tarea`
 * (7.1, D-E caso 2).
 */
export async function editar(supabase: SupabaseClient<Database>, rawInput: EditarInput): Promise<EditarResult> {
  const input = rawInput as unknown as Record<string, unknown>;

  if ("completed_at" in input) {
    return { ok: false, error: 'El campo "completed_at" no está permitido acá: usar completar_tarea.' };
  }
  if ("position" in input) {
    return { ok: false, error: 'El campo "position" no está permitido: la base lo asigna sola.' };
  }
  if (!isValidUuid(rawInput.id)) return { ok: false, error: invalidUuidError(rawInput.id) };

  switch (rawInput.tipo) {
    case "tarea": {
      if (!(await entityExists(supabase, "tasks", rawInput.id))) {
        return { ok: false, error: "No se encontró una tarea con ese id." };
      }

      const patch = pick(input, TASK_PATCH_KEYS);
      if ("description" in patch) {
        const validated = validateDescription(patch.description);
        if (!validated.ok) return { ok: false, error: validated.error };
        patch.description = validated.value;
      }
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("tasks").update(patch as TablesUpdate<"tasks">).eq("id", rawInput.id);
        if (error) throw error;
      }

      if (rawInput.labels) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) return { ok: false, error: "No se pudo identificar al usuario del token." };

        const { error: deleteError } = await supabase.from("task_labels").delete().eq("task_id", rawInput.id);
        if (deleteError) throw deleteError;
        if (rawInput.labels.length > 0) {
          const { error: insertError } = await supabase
            .from("task_labels")
            .insert(rawInput.labels.map((labelId) => ({ task_id: rawInput.id, label_id: labelId, user_id: userData.user.id })));
          if (insertError) throw insertError;
        }
      }
      return { ok: true };
    }

    case "proyecto": {
      if (!(await entityExists(supabase, "projects", rawInput.id))) {
        return { ok: false, error: "No se encontró un proyecto con ese id." };
      }
      const patch = pick(input, PROJECT_PATCH_KEYS);
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("projects").update(patch as TablesUpdate<"projects">).eq("id", rawInput.id);
        if (error) throw error;
      }
      return { ok: true };
    }

    case "habito": {
      if (!(await entityExists(supabase, "habits", rawInput.id))) {
        return { ok: false, error: "No se encontró un hábito con ese id." };
      }
      const patch = pick(input, HABIT_PATCH_KEYS);
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("habits").update(patch as TablesUpdate<"habits">).eq("id", rawInput.id);
        if (error) throw error;
      }
      return { ok: true };
    }

    case "etiqueta": {
      if (!(await entityExists(supabase, "labels", rawInput.id))) {
        return { ok: false, error: "No se encontró una etiqueta con ese id." };
      }
      const patch = pick(input, LABEL_PATCH_KEYS);
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("labels").update(patch as TablesUpdate<"labels">).eq("id", rawInput.id);
        if (error) throw error;
      }
      return { ok: true };
    }

    case "filtro": {
      if (!(await entityExists(supabase, "filters", rawInput.id))) {
        return { ok: false, error: "No se encontró un filtro con ese id." };
      }
      const patch = pick(input, FILTER_PATCH_KEYS);
      if ("query" in patch) {
        const parsed = parseQuery(patch.query as string);
        if (!parsed.ok) {
          return {
            ok: false,
            error: `${parsed.error.message} (posición ${parsed.error.position}, longitud ${parsed.error.length})`,
          };
        }
      }
      if (Object.keys(patch).length > 0) {
        const { error } = await supabase.from("filters").update(patch as TablesUpdate<"filters">).eq("id", rawInput.id);
        if (error) throw error;
      }
      return { ok: true };
    }

    default:
      return { ok: false, error: `tipo "${rawInput.tipo}" no es válido: usar "tarea", "proyecto", "habito", "etiqueta" o "filtro".` };
  }
}
