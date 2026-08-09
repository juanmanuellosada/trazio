import { ProjectMark } from "@/components/layout/project-tree";
import { topLevelTasksForSection } from "@/lib/public-project/build-tree";
import type { SharedProject } from "@/lib/public-project/types";
import { PublicTaskRow } from "./public-task-row";

/**
 * Contenido de la vista pública de un enlace de lectura (bloque 3): sin
 * panel lateral, sin atajos, sin cursor de lista (D-F) — es un Server
 * Component nuevo y entero, no una reutilización de `SectionedTasks`
 * (`components/projects/sectioned-tasks.tsx`, la vista de proyecto de la
 * app privada), que trae arrastre, opciones de vista, selección múltiple y
 * mutaciones que acá no tienen sentido: nada de eso es de solo lectura.
 *
 * Primero las tareas sin sección, después cada sección con las suyas
 * (mismo orden que la vista de proyecto privada, spec §3 "Proyecto") — acá
 * sin bloques colapsables, no hay nada que persista un estado de UI para
 * un visitante sin cuenta.
 */
export function PublicProjectView({ shared }: { shared: SharedProject }) {
  const { project, sections, tasks } = shared;
  const unsectionedTasks = topLevelTasksForSection(tasks, null);
  const isEmpty = sections.length === 0 && tasks.length === 0;

  return (
    <div className="min-h-dvh bg-background">
      <div className="border-b border-border px-4 py-2 text-center text-xs text-text-secondary">
        Vista pública de Trazio, de solo lectura — nadie puede cambiar nada acá.
      </div>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex items-center gap-2.5">
          <ProjectMark project={{ color: project.color, icon: project.icon }} />
          <h1 className="min-w-0 truncate text-2xl font-semibold text-foreground">{project.name}</h1>
        </header>

        {isEmpty ? (
          <p className="text-sm text-text-secondary">Este proyecto todavía no tiene tareas.</p>
        ) : (
          <div className="space-y-8">
            {unsectionedTasks.length > 0 && (
              <ul>
                {unsectionedTasks.map((task) => (
                  <PublicTaskRow key={task.id} task={task} />
                ))}
              </ul>
            )}

            {sections.map((section) => {
              const sectionTasks = topLevelTasksForSection(tasks, section.id);
              return (
                <section key={section.id}>
                  <h2 className="text-sm font-semibold text-foreground">{section.name}</h2>
                  {section.description && <p className="mt-1 text-sm text-text-secondary">{section.description}</p>}
                  {sectionTasks.length > 0 ? (
                    <ul className="mt-2">
                      {sectionTasks.map((task) => (
                        <PublicTaskRow key={task.id} task={task} />
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-text-secondary">Esta sección no tiene tareas.</p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
