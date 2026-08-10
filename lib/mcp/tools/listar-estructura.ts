import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { buildPage, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, resolveOffset, resolvePageSize } from "../pagination";

/**
 * `limite` sin `.int().positive()`: el esquema se limita a la forma del
 * dato (number) y deja que `resolvePageSize` — que ya normaliza límites
 * negativos, cero, no enteros o absurdamente grandes — sea quien decide.
 * Un esquema más estricto acá rechaza esos valores antes de llamar al
 * handler, con el error de protocolo genérico del SDK en vez de la
 * página normalizada que `resolvePageSize` ya sabe devolver.
 */
export const listarEstructuraInputSchema = z.object({
  cursor: z
    .string()
    .optional()
    .describe("Token de paginación de projects: el next_cursor de la respuesta anterior. Omitir en la primera página."),
  limite: z
    .number()
    .optional()
    .describe(
      `Proyectos por página, de 1 a ${MAX_PAGE_SIZE} (default ${DEFAULT_PAGE_SIZE}); etiquetas y filtros no paginan.`,
    ),
});
export type ListarEstructuraInput = z.infer<typeof listarEstructuraInputSchema>;

export type McpSection = { id: string; name: string; position: number };
export type McpProject = {
  id: string;
  name: string;
  parent_id: string | null;
  position: number;
  color: string | null;
  is_inbox: boolean;
  is_archived: boolean;
  sections: McpSection[];
};
export type McpLabelEntry = { id: string; name: string; color: string };
export type McpFilterEntry = { id: string; name: string; query: string };

export type ListarEstructuraResult = {
  projects: McpProject[];
  truncated: boolean;
  next_cursor: string | null;
  labels: McpLabelEntry[];
  labels_truncated: boolean;
  filters: McpFilterEntry[];
  filters_truncated: boolean;
};

type RawProjectRow = Omit<McpProject, "sections"> & { sections: McpSection[] | null };

const PROJECT_COLUMNS = "id, name, parent_id, position, color, is_inbox, is_archived, sections(id, name, position)";

/**
 * `listar_estructura` (spec `mcp`): árbol de proyectos, secciones,
 * etiquetas y filtros guardados. La colección que pagina de verdad (con
 * `cursor`/`next_cursor`, 6.2 de `tasks.md`) es `projects` — la que puede
 * crecer sin techo en una cuenta grande. `labels` y `filters` van con un
 * tope fijo propio (`MAX_PAGE_SIZE`, sin cursor de continuación): en la
 * práctica no crecen al ritmo de las tareas o los proyectos, pero igual
 * nunca se cortan en silencio — si excede el tope, `*_truncated` avisa.
 */
export async function listarEstructura(
  supabase: SupabaseClient<Database>,
  input: ListarEstructuraInput,
): Promise<ListarEstructuraResult> {
  const pageSize = resolvePageSize(input.limite);
  const offset = resolveOffset(input.cursor);

  const [projectsRes, labelsRes, filtersRes] = await Promise.all([
    supabase.from("projects").select(PROJECT_COLUMNS).order("id", { ascending: true }).range(offset, offset + pageSize),
    supabase.from("labels").select("id, name, color").order("id", { ascending: true }).range(0, MAX_PAGE_SIZE),
    supabase.from("filters").select("id, name, query").order("id", { ascending: true }).range(0, MAX_PAGE_SIZE),
  ]);

  if (projectsRes.error) throw projectsRes.error;
  if (labelsRes.error) throw labelsRes.error;
  if (filtersRes.error) throw filtersRes.error;

  const projectPage = buildPage((projectsRes.data ?? []) as unknown as RawProjectRow[], offset, pageSize);
  const labelPage = buildPage((labelsRes.data ?? []) as McpLabelEntry[], 0, MAX_PAGE_SIZE);
  const filterPage = buildPage((filtersRes.data ?? []) as McpFilterEntry[], 0, MAX_PAGE_SIZE);

  return {
    projects: projectPage.items.map((p) => ({
      ...p,
      sections: (p.sections ?? []).slice().sort((a, b) => a.position - b.position),
    })),
    truncated: projectPage.truncated,
    next_cursor: projectPage.nextCursor,
    labels: labelPage.items,
    labels_truncated: labelPage.truncated,
    filters: filterPage.items,
    filters_truncated: filterPage.truncated,
  };
}
