import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reemplaza el conjunto de etiquetas de una tarea por diferencia: primero
 * inserta las que faltan y recién después borra las que sobran. Si falla la
 * inserción no se perdió nada; si falla el borrado quedan etiquetas de más,
 * nunca de menos.
 */
export async function replaceTaskLabels(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  taskId: string,
  labelIds: string[],
  userId: string,
): Promise<void> {
  const { data, error } = await supabase.from("task_labels").select("label_id").eq("task_id", taskId);
  if (error) throw error;
  const current = new Set((data ?? []).map((row: { label_id: string }) => row.label_id));
  const wanted = new Set(labelIds);

  const missing = [...wanted].filter((id) => !current.has(id));
  if (missing.length > 0) {
    const { error: insertError } = await supabase
      .from("task_labels")
      .insert(missing.map((label_id) => ({ task_id: taskId, label_id, user_id: userId })));
    if (insertError) throw insertError;
  }

  const surplus = [...current].filter((id) => !wanted.has(id));
  if (surplus.length > 0) {
    const { error: deleteError } = await supabase
      .from("task_labels")
      .delete()
      .eq("task_id", taskId)
      .in("label_id", surplus);
    if (deleteError) throw deleteError;
  }
}
