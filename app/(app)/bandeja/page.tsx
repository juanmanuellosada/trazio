import { Inbox } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getInboxProjectId } from "@/lib/projects/get-inbox-project";
import { getTasks } from "@/lib/tasks/get-tasks";
import { TaskList } from "@/components/tasks/task-list";
import { TaskListEmptyState } from "@/components/tasks/task-list-empty-state";

/**
 * Bandeja de entrada (bloque 8.1): la Bandeja es un proyecto especial
 * (`is_inbox = true`, B3 del design), así que sus tareas son, ni más ni
 * menos, las tareas de ese proyecto — reutiliza `TaskList` tal cual, sin
 * secciones (acá no se ofrece crearlas). Lectura inicial en el servidor
 * (D1): siembra el caché de TanStack Query que usa `TaskList` en el cliente.
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

  const initialTasks = await getTasks(inboxProjectId);

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-border px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-content items-center gap-2">
          <Inbox aria-hidden className="size-5 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Bandeja de entrada</h1>
        </div>
      </header>
      <div className="mx-auto w-full max-w-content flex-1 overflow-y-auto p-4 sm:p-6">
        <TaskList
          projectId={inboxProjectId}
          sectionId={null}
          parentId={null}
          initialTasks={initialTasks}
          emptyState={
            <TaskListEmptyState
              icon={Inbox}
              title="Tu bandeja de entrada está vacía."
              description="Acá caen las tareas que no asignaste a ningún proyecto. Usá el botón de abajo para agregar una."
            />
          }
        />
      </div>
    </div>
  );
}
