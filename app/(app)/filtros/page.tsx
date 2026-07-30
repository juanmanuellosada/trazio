import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getFilters } from "@/lib/filters/get-filters";
import { FiltersView } from "@/components/filters/filters-view";

/**
 * Pantalla de administración de filtros guardados (bloque 2.13, capacidad
 * `filtros-guardados`): Server Component que trae los filtros del usuario y
 * siembra el caché de `useFilters` — mismo patrón que `app/(app)/etiquetas/page.tsx`.
 */
export default async function FiltrosPage() {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const initialFilters = await getFilters(user.id);

  return <FiltersView initialFilters={initialFilters} />;
}
