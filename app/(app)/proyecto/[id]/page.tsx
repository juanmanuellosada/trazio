import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getAllProjects } from "@/lib/projects/get-all-projects";
import { getSections } from "@/lib/sections/get-sections";
import { getTasks } from "@/lib/tasks/get-tasks";
import { ProjectView } from "@/components/projects/project-view";

/**
 * Vista de proyecto (bloques 6 y 8): Server Component que trae los
 * proyectos del usuario, las secciones y las tareas de este proyecto, y
 * siembra con ellos el caché de TanStack Query que usa `ProjectView` en el
 * cliente (D1: lectura inicial en el servidor).
 */
export default async function ProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const [initialProjects, initialSections, initialTasks] = await Promise.all([
    getAllProjects(user.id),
    getSections(id),
    getTasks(id),
  ]);

  const project = initialProjects.find((p) => p.id === id);
  if (!project) {
    notFound();
  }

  return (
    <ProjectView
      projectId={id}
      initialProjects={initialProjects}
      initialSections={initialSections}
      initialTasks={initialTasks}
    />
  );
}
