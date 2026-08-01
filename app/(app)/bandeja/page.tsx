import { Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getInboxProjectId } from "@/lib/projects/get-inbox-project";
import { getSections } from "@/lib/sections/get-sections";
import { getTasks } from "@/lib/tasks/get-tasks";
import { getUserPreferences } from "@/lib/preferences/get-user-preferences";
import { getViewPreferences } from "@/lib/view-options/get-view-preferences";
import { SectionedTasks } from "@/components/projects/sectioned-tasks";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";
import { TaskQuickAddRow } from "@/components/tasks/task-quick-add-row";

/**
 * Bandeja de entrada (bloque 8.1): la Bandeja es un proyecto especial
 * (`is_inbox = true`, B3 del design), así que sus tareas y secciones son,
 * ni más ni menos, las de ese proyecto (spec §3 "Bandeja de entrada": vista
 * agrupada por sección) — reutiliza `SectionedTasks` tal cual, igual que
 * cualquier proyecto. Lectura inicial en el servidor (D1): siembra el
 * caché de TanStack Query que usan `SectionedTasks`/`TaskList`/`SectionList`
 * en el cliente. Suma las opciones de vista de la clave `bandeja` (bloque
 * 6.5, D-H).
 */
export default async function BandejaPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const inboxProjectId = await getInboxProjectId(user.id);
  if (!inboxProjectId) {
    // No debería pasar: el trigger de aprovisionamiento (B3) crea la
    // Bandeja en el mismo alta de la cuenta.
    return <p className="p-6 text-sm text-text-secondary">No encontramos tu bandeja de entrada.</p>;
  }

  const [initialTasks, initialSections, preferences, initialViewOptions] = await Promise.all([
    getTasks(inboxProjectId),
    getSections(inboxProjectId),
    getUserPreferences(user.id),
    getViewPreferences(user.id, "bandeja"),
  ]);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="w-full max-w-content mx-auto">
          <h1 className="text-2xl font-semibold text-foreground">Bandeja de entrada</h1>
        </div>
      </header>
      <SectionedTasks
        projectId={inboxProjectId}
        viewKey="bandeja"
        initialOptions={initialViewOptions}
        timezone={preferences.timezone}
        initialSections={initialSections}
        initialTasks={initialTasks}
        emptyState={
          <TaskListEmptyState
            icon={Inbox}
            title="Tu bandeja de entrada está vacía."
            description="Acá caen las tareas que no asignaste a ningún proyecto. Usá el botón de abajo para agregar una."
            action={<TaskQuickAddRow projectId={inboxProjectId} sectionId={null} parentId={null} />}
          />
        }
      />
    </div>
  );
}
