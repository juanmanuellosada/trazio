import { createClient } from "@/lib/supabase/server";
import type { LabelChip } from "@/lib/tasks/use-tasks";

/**
 * Todas las etiquetas del usuario, para sembrar el caché de TanStack Query
 * de `useLabels` desde el Server Component de `/etiquetas` (bloque 4.2) —
 * mismo patrón que `getAllProjects` en `lib/projects/get-all-projects.ts`.
 */
export async function getLabels(userId: string): Promise<LabelChip[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("labels")
    .select("id, name, color")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  return (data ?? []) as LabelChip[];
}
