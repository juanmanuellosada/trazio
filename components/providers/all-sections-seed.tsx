"use client";

import { useAllSections } from "@/lib/sections/use-sections";
import type { SectionRow } from "@/lib/sections/use-sections";

/**
 * Siembra el caché de `useAllSections` con lo que ya trajo el Server
 * Component del layout (`getAllSections`), igual que `initialProjects` siembra
 * `useProjects` más abajo en el árbol — así `TaskRow` puede leer el nombre de
 * sección con `useAllSections()` sin pasar `initialData` ni repetir la
 * consulta por vista. No renderiza nada: solo sostiene la query.
 */
export function AllSectionsSeed({ initialSections }: { initialSections: SectionRow[] }) {
  useAllSections(initialSections);
  return null;
}
