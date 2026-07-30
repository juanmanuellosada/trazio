import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getFilter } from "@/lib/filters/get-filter";
import { getUserPreferences } from "@/lib/preferences/get-user-preferences";
import { getViewPreferences } from "@/lib/view-options/get-view-preferences";
import { FilterResultsView } from "@/components/filters/filter-results-view";

/**
 * Página de resultados de un filtro (bloque 2.14, extendida por el bloque
 * 6): Server Component que trae el filtro puntual y siembra el caché de
 * `useFilter` — mismo patrón que `app/(app)/proyecto/[id]/page.tsx`. Suma
 * las opciones de vista de la clave `filtro:<id>` (D-H).
 */
export default async function FiltroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const filter = await getFilter(id, user.id);
  if (!filter) {
    notFound();
  }

  const [preferences, initialOptions] = await Promise.all([
    getUserPreferences(user.id),
    getViewPreferences(user.id, `filtro:${id}`),
  ]);

  return (
    <FilterResultsView filterId={id} initialFilter={filter} timezone={preferences.timezone} initialOptions={initialOptions} />
  );
}
