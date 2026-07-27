"use client";

import type { ReactNode } from "react";
import { SectionList } from "@/components/sections/section-list";
import { TaskList } from "@/components/tasks/task-list";
import { useSections, type SectionRow } from "@/lib/sections/use-sections";
import { useTasks, type TaskRow } from "@/lib/tasks/use-tasks";

/**
 * Tareas y secciones de un proyecto (bloques 6 y 8, spec §3 "Proyecto":
 * "Primero las tareas sin sección, después cada sección colapsable con su
 * propio botón de agregar"): una sola lista continua, sin encabezados
 * artificiales separando "tareas" de "secciones" — el nombre de cada
 * sección hace de separador por sí mismo. Cuando el proyecto no tiene ni
 * tareas ni secciones, un único estado vacío reemplaza a las dos partes
 * (bloque 8.6) en vez de dos mensajes chicos y redundantes por separado.
 *
 * La Bandeja de entrada es un proyecto más (`is_inbox = true`, spec §3
 * "Bandeja de entrada": vista agrupada por sección) y usa este mismo
 * componente, igual que cualquier otro proyecto.
 */
export function SectionedTasks({
  projectId,
  initialSections,
  initialTasks,
  emptyState,
}: {
  projectId: string;
  initialSections: SectionRow[];
  initialTasks: TaskRow[];
  /** Ya renderizado por quien llama: acá no se arma, así puede construirse
   * en un Server Component (Bandeja) sin pasar una referencia de ícono
   * cruda a través del límite servidor/cliente. */
  emptyState: ReactNode;
}) {
  const { data: sectionsData } = useSections(projectId, initialSections);
  const { data: tasksData } = useTasks(projectId, initialTasks);
  const sections = sectionsData ?? [];
  const tasks = tasksData ?? [];
  const isEmpty = sections.length === 0 && tasks.length === 0;

  if (isEmpty) {
    return emptyState;
  }

  return (
    <div className="space-y-4">
      <TaskList projectId={projectId} sectionId={null} parentId={null} initialTasks={initialTasks} />
      <SectionList projectId={projectId} initialSections={initialSections} />
    </div>
  );
}
