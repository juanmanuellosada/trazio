import { createClient } from "@/lib/supabase/server";
import type { SectionRow } from "./use-sections";

/** Secciones de un proyecto, para sembrar el caché desde el Server Component de la página de proyecto. */
export async function getSections(projectId: string): Promise<SectionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sections")
    .select("id, project_id, name, description, position, is_collapsed")
    .eq("project_id", projectId)
    .order("position", { ascending: true });

  return (data ?? []) as SectionRow[];
}
