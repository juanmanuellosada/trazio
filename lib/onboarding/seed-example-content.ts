import type { createClient } from "@/lib/supabase/server";
import { parse } from "@/lib/parser/parse";
import {
  EXAMPLE_FILTER,
  EXAMPLE_HABIT,
  EXAMPLE_PROJECT,
  EXAMPLE_TASK_PLAIN,
  EXAMPLE_TASK_WITH_LABEL,
  EXAMPLE_TASK_WITH_PARSER_PHRASE,
  EXAMPLE_TASK_WITH_SUBTASKS,
} from "./example-content";

// Mismo valor que `SIBLING_SPACING` en `lib/projects/tree.ts`/`lib/tasks/tree.ts`:
// el proyecto y las tareas de ejemplo nacen sin hermanos que rebalancear, así
// que alcanza con espaciarlas de a mil sin leer ninguna posición existente.
const SIBLING_SPACING = 1000;

/**
 * Siembra el contenido de ejemplo de una cuenta nueva
 * (`openspec/changes/onboarding-con-ejemplos`, D-B/D-D/D-F): reclama
 * `user_preferences.seeded_at` con un `update` condicional atómico — si
 * devuelve una fila, esta ejecución ganó la carrera y siembra; si no
 * devuelve nada, ya se sembró antes o otra pestaña se la ganó, y no hace
 * nada más. `resolveEntryPath` (`lib/preferences/get-default-view-path.ts`)
 * la espera antes de resolver a dónde entra la cuenta: tiene que terminar
 * antes de que se pinte la primera pantalla.
 *
 * Nunca tira: un fallo acá no puede bloquear el login de nadie. Si el
 * sembrado falla a mitad de camino, la cuenta queda con contenido parcial
 * (consecuencia aceptada del design, D-B) y no se reintenta — es contenido
 * de ejemplo, borrable con la acción "Borrar los ejemplos".
 */
export async function seedExampleContentIfNeeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<void> {
  try {
    const { data: claimed, error: claimError } = await supabase
      .from("user_preferences")
      .update({ seeded_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("seeded_at", null)
      .select("timezone, week_starts_on")
      .maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) return; // ya sembrada antes, o la ganó otra pestaña

    const parsedPhrase = parse(EXAMPLE_TASK_WITH_PARSER_PHRASE, {
      ahora: new Date(),
      zonaHoraria: claimed.timezone,
      semanaEmpiezaEn: claimed.week_starts_on as 0 | 1 | 6,
      proyectos: [],
      etiquetas: [],
    });

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name: EXAMPLE_PROJECT.name,
        color: EXAMPLE_PROJECT.color,
        icon: EXAMPLE_PROJECT.icon,
        is_example: true,
        position: SIBLING_SPACING,
      })
      .select("id")
      .single();
    if (projectError) throw projectError;

    // Tarea con fecha, hora y prioridad ya aplicadas por el parser real
    // (D-E): el título se guarda tal cual la frase, sin recortar lo que el
    // parser reconoció en ella.
    const { error: taskWithAttributesError } = await supabase.from("tasks").insert({
      user_id: userId,
      project_id: project.id,
      title: EXAMPLE_TASK_WITH_PARSER_PHRASE,
      due_date: parsedPhrase.dueDate,
      due_at: parsedPhrase.dueAt,
      priority: parsedPhrase.priority ?? undefined,
      position: SIBLING_SPACING,
    });
    if (taskWithAttributesError) throw taskWithAttributesError;

    // Tarea con subtareas.
    const { data: parentTask, error: parentTaskError } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        project_id: project.id,
        title: EXAMPLE_TASK_WITH_SUBTASKS.title,
        position: SIBLING_SPACING * 2,
      })
      .select("id")
      .single();
    if (parentTaskError) throw parentTaskError;

    const { error: subtasksError } = await supabase.from("tasks").insert(
      EXAMPLE_TASK_WITH_SUBTASKS.subtasks.map((title, index) => ({
        user_id: userId,
        project_id: project.id,
        parent_id: parentTask.id,
        title,
        position: SIBLING_SPACING * (index + 1),
      })),
    );
    if (subtasksError) throw subtasksError;

    // Tarea con una etiqueta.
    const { data: label, error: labelError } = await supabase
      .from("labels")
      .insert({ user_id: userId, name: EXAMPLE_TASK_WITH_LABEL.labelName, color: EXAMPLE_TASK_WITH_LABEL.labelColor })
      .select("id")
      .single();
    if (labelError) throw labelError;

    const { data: labeledTask, error: labeledTaskError } = await supabase
      .from("tasks")
      .insert({
        user_id: userId,
        project_id: project.id,
        title: EXAMPLE_TASK_WITH_LABEL.title,
        position: SIBLING_SPACING * 3,
      })
      .select("id")
      .single();
    if (labeledTaskError) throw labeledTaskError;

    const { error: taskLabelError } = await supabase
      .from("task_labels")
      .insert({ task_id: labeledTask.id, label_id: label.id, user_id: userId });
    if (taskLabelError) throw taskLabelError;

    // Tarea sin ningún atributo.
    const { error: plainTaskError } = await supabase.from("tasks").insert({
      user_id: userId,
      project_id: project.id,
      title: EXAMPLE_TASK_PLAIN,
      position: SIBLING_SPACING * 4,
    });
    if (plainTaskError) throw plainTaskError;

    // Hábito de ejemplo, sin hora programada (D-E): `scheduled_time` no se
    // manda, la columna ya es nula por default.
    const { error: habitError } = await supabase.from("habits").insert({
      user_id: userId,
      name: EXAMPLE_HABIT.name,
      icon: EXAMPLE_HABIT.icon,
      color: EXAMPLE_HABIT.color,
      duration_minutes: EXAMPLE_HABIT.durationMinutes,
      frequency_type: EXAMPLE_HABIT.frequencyType,
      is_example: true,
    });
    if (habitError) throw habitError;

    // Filtro de ejemplo, favorito desde que se crea (D-D de la ampliación):
    // aparece en el panel lateral sin que la persona tenga que ir a
    // buscarlo a la pantalla de Filtros.
    const { error: filterError } = await supabase.from("filters").insert({
      user_id: userId,
      name: EXAMPLE_FILTER.name,
      query: EXAMPLE_FILTER.query,
      color: EXAMPLE_FILTER.color,
      icon: EXAMPLE_FILTER.icon,
      is_favorite: EXAMPLE_FILTER.isFavorite,
      is_example: true,
    });
    if (filterError) throw filterError;
  } catch (error) {
    console.error("No se pudo sembrar el contenido de ejemplo.", error);
  }
}
