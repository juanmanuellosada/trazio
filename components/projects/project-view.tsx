"use client";

import { SectionList } from "@/components/sections/section-list";
import { useProjects, type ProjectRow } from "@/lib/projects/use-projects";
import type { SectionRow } from "@/lib/sections/use-sections";
import { ProjectHeader } from "./project-header";

/**
 * Vista de proyecto (bloque 6): encabezado con las acciones del proyecto y
 * sus secciones. La lista de tareas sin sección y dentro de cada sección es
 * del bloque 8 (vista Proyecto completa); acá viven la creación, el
 * renombrado, el reordenado, el colapso y el borrado de las secciones.
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
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <h2 className="mb-2 text-sm font-semibold tracking-wide text-text-secondary uppercase">Secciones</h2>
        <SectionList projectId={projectId} initialSections={initialSections} />
      </div>
    </div>
  );
}
