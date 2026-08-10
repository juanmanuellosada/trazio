import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createNextRecurringOccurrence } from "@/lib/recurrence/create-next-occurrence";
import { entityExists, invalidUuidError, isValidUuid } from "./shared";

export const completarTareaInputSchema = z.object({
  id: z.string().describe("Id de la tarea a completar o descompletar, obtenido de consultar_tareas u obtener_tarea."),
  completado: z
    .boolean()
    .describe(
      "true para completarla, false para volverla a dejar pendiente. Completar una tarea con recurrence_rule " +
        "crea automáticamente la siguiente ocurrencia de la serie; descompletar nunca tiene efectos secundarios.",
    ),
});
export type CompletarTareaInput = z.infer<typeof completarTareaInputSchema>;

export type CompletarTareaResult = { ok: true; next_occurrence_id: string | null } | { ok: false; error: string };

/**
 * `completar_tarea` (spec `mcp`, D-E caso 1 de `design.md` — el invariante
 * más grave de esta ola): no hay ningún trigger de recurrencia en `tasks`.
 * Un `UPDATE` directo poniendo `completed_at` sobre una tarea recurrente
 * mata la recurrencia en silencio, sin error. Por eso, si `completado: true`
 * queda puesto, se llama a `createNextRecurringOccurrence`
 * (`lib/recurrence/create-next-occurrence.ts`) con el mismo cliente
 * autenticado del usuario — la misma función que `useUpdateTask`
 * (`lib/tasks/mutations.ts`) llama desde la app, sin reimplementar nada de
 * `lib/recurrence/`. Esa función ya resuelve D53 (completar antes de vencer
 * corta en el vencimiento, no en hoy) puertas adentro — nada especial que
 * hacer acá para eso.
 *
 * Al descompletar (`completado: false`) no se llama a la función de
 * recurrencia: ningún efecto lateral, igual que en la app.
 */
export async function completarTarea(
  supabase: SupabaseClient<Database>,
  input: CompletarTareaInput,
): Promise<CompletarTareaResult> {
  if (!isValidUuid(input.id)) return { ok: false, error: invalidUuidError(input.id) };
  if (!(await entityExists(supabase, "tasks", input.id))) {
    return { ok: false, error: "No se encontró una tarea con ese id." };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ completed_at: input.completado ? new Date().toISOString() : null })
    .eq("id", input.id);
  if (error) throw error;

  if (!input.completado) return { ok: true, next_occurrence_id: null };

  const next = await createNextRecurringOccurrence(supabase, input.id);
  return { ok: true, next_occurrence_id: next?.id ?? null };
}
