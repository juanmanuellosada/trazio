import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getUserPreferences } from "@/lib/preferences/get-user-preferences";
import { getLabels } from "@/lib/labels/get-labels";
import { getLabelTasks } from "@/lib/labels/get-label-tasks";
import { getViewPreferences } from "@/lib/view-options/get-view-preferences";
import { LabelView } from "@/components/labels/label-view";

/**
 * Página de una etiqueta (bloque 3.4, capacidad `navegacion-por-etiqueta`):
 * Server Component que resuelve la etiqueta por `id` sobre las etiquetas del
 * usuario (mismo patrón que `app/(app)/proyecto/[id]/page.tsx` con
 * `getAllProjects`) y siembra el caché de sus tareas.
 */
export default async function EtiquetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const [labels, preferences] = await Promise.all([getLabels(user.id), getUserPreferences(user.id)]);
  const label = labels.find((l) => l.id === id);
  if (!label) {
    notFound();
  }

  const [initialTasks, initialOptions] = await Promise.all([
    getLabelTasks(user.id, id, preferences.timezone),
    getViewPreferences(user.id, `etiqueta:${id}`),
  ]);

  return (
    <LabelView
      labelId={id}
      initialLabels={labels}
      userId={user.id}
      timezone={preferences.timezone}
      initialTasks={initialTasks}
      initialOptions={initialOptions}
    />
  );
}
