import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getLabels } from "@/lib/labels/get-labels";
import { LabelsView } from "@/components/labels/labels-view";

/**
 * Pantalla de administración de etiquetas (bloque 4.2, capacidad
 * `administracion-de-etiquetas`): Server Component que trae las etiquetas
 * del usuario y siembra el caché de `useLabels` — mismo patrón que
 * `app/(app)/proyecto/[id]/page.tsx` con `getAllProjects`.
 */
export default async function EtiquetasPage() {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const initialLabels = await getLabels(user.id);

  return <LabelsView initialLabels={initialLabels} />;
}
