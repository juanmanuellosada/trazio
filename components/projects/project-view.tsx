"use client";

import { ListTodo } from "lucide-react";
import { SectionList } from "@/components/sections/section-list";
import { TaskList } from "@/components/tasks/task-list";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { TaskQuickAddRow } from "@/components/tasks/task-quick-add-row";
import { useProjects, type ProjectRow } from "@/lib/projects/use-projects";
import { useSections, type SectionRow } from "@/lib/sections/use-sections";
import { useTasks, type TaskRow } from "@/lib/tasks/use-tasks";
import { ProjectHeader } from "./project-header";

/**
 * Vista de proyecto (bloques 6 y 8): encabezado con las acciones del
 * proyecto, después primero las tareas sin sección y por último las
 * secciones colapsables, cada una con su propio botón de agregar (ya
 * dentro de `SectionList`/`TaskList`, bloque 6.8 y 7). Cuando el proyecto
 * no tiene ni tareas ni secciones, un único estado vacío reemplaza a las
 * dos partes (bloque 8.6) en vez de mostrar dos mensajes chicos y
 * redundantes por separado.
 */
export function ProjectView({
  projectId,
  initialProjects,
  initialSections,
  initialTasks,
}: {
  projectId: string;
  initialProjects: ProjectRow[];
  initialSections: SectionRow[];
  initialTasks: TaskRow[];
}) {
  const { data: projects } = useProjects(initialProjects);
  const { data: sectionsData } = useSections(projectId, initialSections);
  const { data: tasksData } = useTasks(projectId, initialTasks);
  const allProjects = projects ?? initialProjects;
  const project = allProjects.find((p) => p.id === projectId);
  const sections = sectionsData ?? [];
  const tasks = tasksData ?? [];
  const isEmpty = sections.length === 0 && tasks.length === 0;

  if (!project) {
    return <p className="p-6 text-sm text-text-secondary">Este proyecto ya no existe.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader project={project} allProjects={allProjects} />
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isEmpty ? (
          <TaskListEmptyState
            icon={ListTodo}
            title="Este proyecto todavía no tiene tareas."
            description="Acá van a aparecer las tareas y las secciones que agregues."
            action={<TaskQuickAddRow projectId={projectId} sectionId={null} parentId={null} />}
          />
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">Tareas</h2>
              <TaskList projectId={projectId} sectionId={null} parentId={null} initialTasks={initialTasks} />
            </div>
            <div>
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">Secciones</h2>
              <SectionList projectId={projectId} initialSections={initialSections} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
