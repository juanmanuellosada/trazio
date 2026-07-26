import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getTask } from "@/lib/tasks/get-task";
import { TaskDetailContent } from "@/components/tasks/task-detail-content";

/**
 * Ruta de una tarea suelta (bloque 7.11, F3 del design): pantalla completa
 * con su propio `<title>`, destino de "copiar enlace directo" y de "abrir
 * en ventana aparte". Dentro de la app, el mismo contenido (`TaskDetailContent`)
 * se muestra como panel lateral (`task-detail-panel.tsx`); acá no hay
 * `onClose`, porque no hay nada que cerrar: es la página en sí.
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
    <div className="mx-auto h-full max-w-3xl">
      <TaskDetailContent taskId={id} initialData={task} />
    </div>
  );
}
