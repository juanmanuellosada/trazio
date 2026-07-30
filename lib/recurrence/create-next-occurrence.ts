import type { SupabaseClient } from "@supabase/supabase-js";
import { today } from "@/lib/parser/dates";
import type { Json } from "@/lib/supabase/database.types";
import { planNextOccurrence } from "./series";

const RECURRING_TASK_COLUMNS =
  "id, user_id, project_id, section_id, title, description, priority, due_date, due_at, duration_minutes, deadline, recurrence_rule, recurrence_ends_at, recurrence_count, position, task_labels(label_id)";

/** Mismo default que `lib/preferences/get-user-preferences.ts` para el caso sin fila todavía (no debería pasar tras el aprovisionamiento). */
const DEFAULT_TIMEZONE = "America/Argentina/Buenos_Aires";

/**
 * `id` y `updated_at` de la instancia recién creada, tal como quedó en el
 * insert (bloque 5.x, deshacer-completa-recurrente): quien la crea guarda
 * este `updated_at` para poder comprobar después, al deshacer, si alguien ya
 * tocó esa instancia (editarla o completarla también actualiza
 * `updated_at`, gracias al trigger `tasks_set_updated_at_trigger`).
 */
export type NextOccurrence = { id: string; updatedAt: string };

type RecurringTaskRow = {
  id: string;
  user_id: string;
  project_id: string;
  section_id: string | null;
  title: string;
  description: Json | null;
  priority: number;
  due_date: string | null;
  due_at: string | null;
  duration_minutes: number | null;
  deadline: string | null;
  recurrence_rule: string | null;
  recurrence_ends_at: string | null;
  recurrence_count: number | null;
  position: number;
  task_labels: { label_id: string }[] | null;
};

/**
 * Al completar una tarea recurrente (bloque 5.4, requirement "Generar la
 * siguiente ocurrencia al completar una tarea recurrente"): crea la
 * siguiente instancia heredando proyecto, sección, título, descripción,
 * prioridad, duración estimada, fecha límite y etiquetas — nunca subtareas,
 * comentarios ni recordatorios, que ni siquiera se leen acá. No hace nada
 * si la tarea no tiene `recurrence_rule` o si la serie ya terminó
 * (`lib/recurrence/series.ts`, D-E). Devuelve el id y el `updated_at` de la
 * tarea creada, o `null` si no correspondía crear ninguna.
 *
 * La zona horaria se resuelve acá adentro (una consulta propia a
 * `user_preferences`), en vez de recibirla como parámetro: así esta función
 * no depende de `useUserPreferences()` ni de ningún contexto de React, y
 * `useUpdateTask` puede llamarla desde cualquier árbol de componentes —
 * incluidos los tests de otras áreas que no montan `<PreferencesProvider>`.
 */
export async function createNextRecurringOccurrence(
  supabase: SupabaseClient,
  taskId: string,
  now: Date = new Date(),
): Promise<NextOccurrence | null> {
  const { data, error } = await supabase.from("tasks").select(RECURRING_TASK_COLUMNS).eq("id", taskId).single();
  if (error) throw error;

  const task = data as unknown as RecurringTaskRow;
  if (!task.recurrence_rule) return null;

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("timezone")
    .eq("user_id", task.user_id)
    .single();
  const timezone = (preferences as { timezone: string } | null)?.timezone ?? DEFAULT_TIMEZONE;

  const plan = planNextOccurrence(
    {
      recurrence_rule: task.recurrence_rule,
      recurrence_ends_at: task.recurrence_ends_at,
      recurrence_count: task.recurrence_count,
      due_date: task.due_date,
      due_at: task.due_at,
    },
    now,
    today(now, timezone),
    timezone,
  );
  if (!plan) return null;

  const { data: created, error: insertError } = await supabase
    .from("tasks")
    .insert({
      user_id: task.user_id,
      project_id: task.project_id,
      section_id: task.section_id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      due_date: plan.due_date,
      due_at: plan.due_at,
      duration_minutes: task.duration_minutes,
      deadline: task.deadline,
      recurrence_rule: task.recurrence_rule,
      recurrence_ends_at: task.recurrence_ends_at,
      recurrence_count: plan.recurrence_count,
      position: task.position,
    })
    .select("id, updated_at")
    .single();
  if (insertError) throw insertError;

  const labelIds = (task.task_labels ?? []).map((link) => link.label_id);
  if (labelIds.length > 0) {
    const { error: labelsError } = await supabase
      .from("task_labels")
      .insert(labelIds.map((labelId) => ({ task_id: created.id, label_id: labelId, user_id: task.user_id })));
    if (labelsError) throw labelsError;
  }

  return { id: created.id as string, updatedAt: created.updated_at as string };
}
