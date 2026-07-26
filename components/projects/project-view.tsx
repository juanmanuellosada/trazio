"use client";

import { SectionList } from "@/components/sections/section-list";
import { TaskList } from "@/components/tasks/task-list";
import { useProjects, type ProjectRow } from "@/lib/projects/use-projects";
import type { SectionRow } from "@/lib/sections/use-sections";
import { ProjectHeader } from "./project-header";

/**
 * Vista de proyecto (bloque 6): encabezado con las acciones del proyecto y
 * sus secciones. El orden "primero las tareas sin sección, después las
 * secciones colapsables" y el resto del pulido de esta vista son del
 * bloque 8; acá alcanza con montar `TaskList` (bloque 7) para que el CRUD
 * de tareas tenga un lugar real donde probarse — las tareas de cada
 * sección se muestran dentro de `SectionList`, no acá.
 */
export function ProjectView({
  projectId,
  initialProjects,
  initialSections,
}: {
  projectId: string;
  initialProjects: ProjectRow[];
  initialSections: SectionRow[];
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
      <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
        <div>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">Tareas</h2>
          <TaskList projectId={projectId} sectionId={null} parentId={null} />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">Secciones</h2>
          <SectionList projectId={projectId} initialSections={initialSections} />
        </div>
      </div>
    </div>
  );
}
