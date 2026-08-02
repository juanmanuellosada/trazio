import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getTask } from "@/lib/tasks/get-task";
import { TaskDetailContent } from "@/components/tasks/task-detail-content";
import { RecordRecentTaskView } from "@/components/tasks/record-recent-task-view";

/**
 * Ruta de una tarea suelta (bloque 6, antes 7.11): pantalla completa
 * con su propio `<title>`, destino de "copiar enlace directo" y de "abrir
 * en ventana aparte". Dentro de la app, el mismo contenido (`TaskDetailContent`)
 * se muestra como modal centrado en escritorio o pantalla completa en
 * teléfono (`task-detail-panel.tsx`, D28); acá no hay `onClose`, porque no
 * hay nada que cerrar: es la página en sí.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return {};

  const task = await getTask(id, user.id);
  return { title: task ? `${task.title} — Trazio` : "Tarea no encontrada — Trazio" };
}

export default async function TareaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const task = await getTask(id, user.id);

  return (
    <div className="h-full max-w-content mx-auto">
      {task && <RecordRecentTaskView taskId={id} />}
      <TaskDetailContent taskId={id} initialData={task} />
    </div>
  );
}
