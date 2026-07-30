import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { SearchView } from "@/components/search/search-view";

/**
 * Ruta del buscador (bloque 2.18, capacidad `buscador`). Sin datos que
 * sembrar desde el servidor: la búsqueda arranca vacía hasta que se
 * escriben al menos dos caracteres (`lib/search/use-search.ts`).
 */
export default async function BuscarPage() {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  return <SearchView />;
}
