import type { SupabaseClient } from "@supabase/supabase-js";
import { duplicateTaskTree } from "@/lib/tasks/duplicate";

const PROJECT_COPY_COLUMNS = "name, color, icon, description, preferred_view, parent_id";

type ProjectCopySource = {
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  preferred_view: string;
  parent_id: string | null;
};

/**
 * Duplica un proyecto (`duplicar-un-proyecto`): el proyecto en sí, sus
 * secciones con su descripción, y sus tareas pendientes con subtareas y
 * etiquetas, reusando `duplicateTaskTree` (`lib/tasks/duplicate.ts`) una vez
 * por tarea raíz — no se reescribe la copia de tareas, que ya está probada.
 *
 * Lo que NUNCA copia (D-B del design): tareas completadas (se filtran acá,
 * antes de llamar a `duplicateTaskTree`, no después — 1.3 de tasks.md),
 * comentarios ni recordatorios (quedan afuera solo por no tocar esas tablas,
 * igual que ya le pasa al duplicado de una sola tarea) y el estado de
 * favorito/archivado (el insert del proyecto nuevo no los toca, quedan en
 * su default `false`). Las fechas se copian tal cual (D-A): esto es
 * duplicar, no una plantilla. Los subproyectos no se arrastran (D-C): la
 * copia hereda el `parent_id` del original -así queda junto a él, como
 * hermano, en el mismo nivel del árbol- pero nunca se leen los hijos del
 * original: sus propios subproyectos no generan copias.
 *
 * Una tarea completada que cuelga de una raíz pendiente sí viaja: filtrar
 * "no después" significa filtrar la selección de raíces, no podar el
 * subárbol de cada una — eso es lo que `duplicateTaskTree` ya hace al
 * duplicar una sola tarea (la copia siempre nace pendiente, subtareas
 * incluidas), y duplicar un proyecto no le inventa una regla nueva.
 *
 * No es transaccional (2.4 de tasks.md, Risk del design): el bucle inserta
 * de a una tarea, así que si falla a mitad de camino el proyecto queda con
 * lo que ya se alcanzó a copiar. La decisión tomada en el design es no
 * limpiarlo: es más simple, y ese proyecto a medias se borra con la acción
 * "Eliminar" que ya existe. Por eso acá no hay try/catch que deshaga nada —
 * el error sube tal cual y lo interpreta `reportProjectError`.
 */
export async function duplicateProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  position: number,
): Promise<string> {
  const { data: source, error: sourceError } = await supabase
    .from("projects")
    .select(PROJECT_COPY_COLUMNS)
    .eq("id", projectId)
    .single();
  if (sourceError) throw sourceError;
  const project = source as ProjectCopySource;

  const { data: newProject, error: insertProjectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      parent_id: project.parent_id,
      name: `${project.name} (copia)`,
      color: project.color,
      icon: project.icon,
      description: project.description,
      preferred_view: project.preferred_view,
      position,
    })
    .select("id")
    .single();
  if (insertProjectError) throw insertProjectError;
  const newProjectId = newProject.id as string;

  const { data: sections, error: sectionsError } = await supabase
    .from("sections")
    .select("id, name, description, position")
    .eq("project_id", projectId)
    .order("position", { ascending: true });
  if (sectionsError) throw sectionsError;

  const sectionIdMap = new Map<string, string>();
  for (const section of (sections ?? []) as { id: string; name: string; description: string | null; position: number }[]) {
    const { data: newSection, error: insertSectionError } = await supabase
      .from("sections")
      .insert({
        user_id: userId,
        project_id: newProjectId,
        name: section.name,
        description: section.description,
        position: section.position,
      })
      .select("id")
      .single();
    if (insertSectionError) throw insertSectionError;
    sectionIdMap.set(section.id, newSection.id as string);
  }

  const { data: rootTasks, error: rootTasksError } = await supabase
    .from("tasks")
    .select("id, section_id, position")
    .eq("project_id", projectId)
    .is("parent_id", null)
    .is("completed_at", null)
    .order("position", { ascending: true });
  if (rootTasksError) throw rootTasksError;

  const taskIdMap = new Map<string, string>();
  for (const task of (rootTasks ?? []) as { id: string; section_id: string | null; position: number }[]) {
    const newSectionId = task.section_id ? (sectionIdMap.get(task.section_id) ?? null) : null;
    await duplicateTaskTree(supabase, task.id, task.position, {
      projectId: newProjectId,
      sectionId: newSectionId,
      onCopied: (oldId, newId) => taskIdMap.set(oldId, newId),
    });
  }

  const oldTaskIds = [...taskIdMap.keys()];
  if (oldTaskIds.length > 0) {
    const { data: labelLinks, error: labelLinksError } = await supabase
      .from("task_labels")
      .select("task_id, label_id")
      .in("task_id", oldTaskIds);
    if (labelLinksError) throw labelLinksError;

    const newLabelLinks = ((labelLinks ?? []) as { task_id: string; label_id: string }[])
      .map((link) => ({ task_id: taskIdMap.get(link.task_id), label_id: link.label_id, user_id: userId }))
      .filter((link): link is { task_id: string; label_id: string; user_id: string } => link.task_id != null);

    if (newLabelLinks.length > 0) {
      const { error: insertLabelsError } = await supabase.from("task_labels").insert(newLabelLinks);
      if (insertLabelsError) throw insertLabelsError;
    }
  }

  return newProjectId;
}
