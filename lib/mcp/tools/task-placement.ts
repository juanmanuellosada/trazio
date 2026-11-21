import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchDescendants } from "@/lib/tasks/move-subtree";
import { isValidUuid } from "./shared";

export type TaskPlacement = { project_id: string; section_id: string | null; parent_id: string | null };
export type TaskPlacementResult = { ok: true } | { ok: false; error: string };

const invalid = (field: string, why: string): TaskPlacementResult => ({ ok: false, error: `El campo "${field}" ${why}` });

/**
 * Valida la ubicación resultante de una tarea (D-D de `integridad-del-arbol-de-tareas`):
 * el proyecto existe, la sección es de ese proyecto, el padre existe, está en el mismo
 * proyecto y no es la propia tarea ni uno de sus descendientes. `taskId` solo se pasa
 * si la tarea ya existe. La base no impide ciclos ni padres de otro proyecto, por eso
 * esta regla vive acá.
 */
export async function validateTaskPlacement(
  supabase: SupabaseClient<Database>,
  placement: TaskPlacement,
  taskId?: string,
): Promise<TaskPlacementResult> {
  const { project_id, section_id, parent_id } = placement;

  if (!isValidUuid(project_id)) return invalid("project_id", "no es un UUID válido.");
  const { data: project, error: projectError } = await supabase.from("projects").select("id").eq("id", project_id).maybeSingle();
  if (projectError) throw projectError;
  if (!project) return invalid("project_id", "no corresponde a un proyecto existente.");

  if (section_id !== null) {
    if (!isValidUuid(section_id)) return invalid("section_id", "no es un UUID válido.");
    const { data: section, error: sectionError } = await supabase
      .from("sections")
      .select("id, project_id")
      .eq("id", section_id)
      .maybeSingle();
    if (sectionError) throw sectionError;
    if (!section || section.project_id !== project_id) {
      return invalid("section_id", "no corresponde a una sección del proyecto de la tarea.");
    }
  }

  if (parent_id !== null) {
    if (!isValidUuid(parent_id)) return invalid("parent_id", "no es un UUID válido.");
    if (taskId !== undefined && parent_id === taskId) return invalid("parent_id", "no puede ser la propia tarea.");

    const { data: parent, error: parentError } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", parent_id)
      .maybeSingle();
    if (parentError) throw parentError;
    if (!parent) return invalid("parent_id", "no corresponde a una tarea existente.");

    if (taskId !== undefined) {
      const descendants = await fetchDescendants(supabase, taskId);
      if (descendants.some((d) => d.id === parent_id)) {
        return invalid("parent_id", "no puede ser una subtarea de la propia tarea: se formaría un ciclo.");
      }
    }
    if (parent.project_id !== project_id) {
      return invalid("parent_id", "apunta a una tarea de otro proyecto: una subtarea queda en el proyecto de su padre.");
    }
  }

  return { ok: true };
}
