/**
 * Ruta de ancestros de un proyecto ("Trabajo" o "Trabajo/Personal", hasta
 * los 3 niveles del bloque 6.3): la que espera `ParserProject.path`
 * (`lib/parser/types.ts`). Extraída de `use-parser-context.ts` (bloque 9,
 * hook de cliente) para poder reusarla también del lado del servidor, en
 * `lib/mcp/tools/crear-tarea.ts` (Ola 7 de `servidor-mcp`) — ninguno de los
 * dos lados necesita más que `id`/`name`/`parent_id`, así que la firma es
 * genérica en vez de atarse a `ProjectRow`.
 */
export type ProjectPathLike = { id: string; name: string; parent_id: string | null };

export function projectPath<T extends ProjectPathLike>(projects: T[], project: T): string {
  const names = [project.name];
  let current: T = project;
  while (current.parent_id) {
    const parent = projects.find((p) => p.id === current.parent_id);
    if (!parent) break;
    names.unshift(parent.name);
    current = parent;
  }
  return names.join("/");
}
