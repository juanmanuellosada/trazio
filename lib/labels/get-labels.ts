import { createClient } from "@/lib/supabase/server";
import type { Label } from "./use-labels";

/**
 * Todas las etiquetas del usuario, para sembrar el caché de TanStack Query
 * de `useLabels` desde el Server Component de `/etiquetas` (bloque 4.2) y de
 * `/etiquetas/<id>` (bloque 3.4) — mismo patrón que `getAllProjects` en
 * `lib/projects/get-all-projects.ts`.
 */
export async function getLabels(userId: string): Promise<Label[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("labels")
    .select("id, name, color, is_favorite")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  return (data ?? []) as Label[];
}
