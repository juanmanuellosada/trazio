import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getAllProjects } from "@/lib/projects/get-all-projects";
import { getSections } from "@/lib/sections/get-sections";
import { ProjectView } from "@/components/projects/project-view";

/**
 * Vista de proyecto (bloque 6): Server Component que trae los proyectos del
 * usuario y las secciones de este proyecto, y siembra con ellos el caché de
 * TanStack Query que usa `ProjectView` en el cliente.
 */
export default async function ProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const [initialProjects, initialSections] = await Promise.all([getAllProjects(user.id), getSections(id)]);

  const project = initialProjects.find((p) => p.id === id);
  if (!project) {
    notFound();
  }

  return <ProjectView projectId={id} initialProjects={initialProjects} initialSections={initialSections} />;
}
