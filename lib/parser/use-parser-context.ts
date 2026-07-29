"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useLabels } from "@/lib/labels/use-labels";
import { useProjects, type ProjectRow } from "@/lib/projects/use-projects";
import type { ParserLabel, ParserProject } from "./types";

type AllSectionRow = { id: string; project_id: string; name: string };

const ALL_SECTIONS_QUERY_KEY = ["sections", "todas"] as const;

/**
 * Todas las secciones del usuario, sin filtrar por proyecto: `#Proyecto/Sección`
 * (E7) tiene que poder resolver contra cualquier proyecto, no solo el que
 * está montado en la vista actual. Una sola consulta (RLS ya la acota al
 * usuario), no una por proyecto — el N+1 que prohíbe `.claude/rules/database.md`.
 */
async function fetchAllSections(): Promise<AllSectionRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("sections").select("id, project_id, name");
  if (error) throw error;
  return (data ?? []) as AllSectionRow[];
}

function useAllSections() {
  return useQuery({ queryKey: ALL_SECTIONS_QUERY_KEY, queryFn: fetchAllSections });
}

/** Ruta de ancestros de un proyecto ("Trabajo" o "Trabajo/Personal", hasta los 3 niveles del bloque 6.3), la que espera `ParserProject.path`. */
function projectPath(projects: ProjectRow[], project: ProjectRow): string {
  const names = [project.name];
  let current = project;
  while (current.parent_id) {
    const parent = projects.find((p) => p.id === current.parent_id);
    if (!parent) break;
    names.unshift(parent.name);
    current = parent;
  }
  return names.join("/");
}

/**
 * Arma el `proyectos`/`etiquetas` que pide la firma de `parse()` (E1): la
 * lista real de proyectos con su ruta de ancestros ya resuelta y sus
 * secciones, más las etiquetas existentes del usuario — todo ya en caché
 * de TanStack Query (`useProjects`/`useLabels` sembrados desde el layout),
 * salvo las secciones cruzadas, que se piden acá.
 */
export function useParserContext(): { proyectos: ParserProject[]; etiquetas: ParserLabel[] } {
  const { data: projects } = useProjects();
  const { data: sections } = useAllSections();
  const { data: labels } = useLabels();

  return useMemo(() => {
    const projectRows = projects ?? [];
    const sectionRows = sections ?? [];

    const proyectos: ParserProject[] = projectRows
      .filter((p) => !p.is_archived)
      .map((project) => ({
        id: project.id,
        name: project.name,
        path: projectPath(projectRows, project),
        sections: sectionRows
          .filter((s) => s.project_id === project.id)
          .map((s) => ({ id: s.id, name: s.name })),
      }));

    return {
      proyectos,
      etiquetas: (labels ?? []).map((l) => ({ id: l.id, name: l.name })),
    };
  }, [projects, sections, labels]);
}
