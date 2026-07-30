"use client";

import { ListTodo } from "lucide-react";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { TaskQuickAddRow } from "@/components/tasks/task-quick-add-row";
import { useProjects, type ProjectRow } from "@/lib/projects/use-projects";
import type { SectionRow } from "@/lib/sections/use-sections";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { ViewOptions } from "@/lib/view-options/schema";
import { ProjectHeader } from "./project-header";
import { SectionedTasks } from "./sectioned-tasks";

/**
 * Vista de proyecto (bloques 6 y 8): encabezado con las acciones del
 * proyecto y, debajo, la barra de opciones de vista y las tareas y
 * secciones del proyecto vía `SectionedTasks` (spec §3 "Proyecto",
 * `opciones-de-vista`). `viewKey` es `proyecto:<id>` (D-H).
 */
export function ProjectView({
  projectId,
  initialProjects,
  initialSections,
  initialTasks,
  initialViewOptions,
  timezone,
}: {
  projectId: string;
  initialProjects: ProjectRow[];
  initialSections: SectionRow[];
  initialTasks: TaskRow[];
  initialViewOptions: ViewOptions;
  timezone: string;
}) {
  const { data: projects } = useProjects(initialProjects);
  const allProjects = projects ?? initialProjects;
  const project = allProjects.find((p) => p.id === projectId);

  if (!project) {
    return <p className="p-6 text-sm text-text-secondary">Este proyecto ya no existe.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader project={project} allProjects={allProjects} />
      <SectionedTasks
        projectId={projectId}
        viewKey={`proyecto:${projectId}`}
        initialOptions={initialViewOptions}
        timezone={timezone}
        initialSections={initialSections}
        initialTasks={initialTasks}
        emptyState={
          <TaskListEmptyState
            icon={ListTodo}
            title="Este proyecto todavía no tiene tareas."
            description="Acá van a aparecer las tareas y las secciones que agregues."
            action={<TaskQuickAddRow projectId={projectId} sectionId={null} parentId={null} />}
          />
        }
      />
    </div>
  );
}
