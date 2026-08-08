/**
 * Aplanado de una lista al orden visual (bloque 2, capacidad
 * `cursor-de-lista`, D-B): dados los grupos ya resueltos por la pantalla —
 * con su jerarquía de subtareas y qué está colapsado — devuelve los ids de
 * fila en el orden exacto en que se ven. Función pura, sin DOM, para que
 * `lib/cursor/reducer.ts` reciba `orderedIds` sin que cada pantalla tenga
 * que reimplementar el recorrido.
 *
 * Nota (tasks.md 2.2): la firma queda planteada acá, sin estrenarse todavía
 * en ninguna pantalla — eso es bloque 3+ (foco, roving tabindex, cableado
 * por componente), fuera de esta delegación. Si al cablear la primera
 * pantalla la forma de `FlattenGroup`/`FlattenRow` no alcanza, corregirla
 * ahí, no acá.
 */
export type FlattenRow = {
  id: string;
  /**
   * Subtarea plegada (`useState` local de `TaskRow`): la fila misma entra
   * en el recorrido, pero sus `children` no.
   */
  collapsed?: boolean;
  children?: FlattenRow[];
};

export type FlattenGroup = {
  /** Sección colapsada (`SectionRow.is_collapsed`): ninguna de sus `rows` entra. */
  collapsed?: boolean;
  rows: FlattenRow[];
};

/**
 * Los encabezados de grupo y de sección nunca entran al resultado porque no
 * son parte de este modelo: solo se aplanan `rows`, nunca `group.label` ni
 * nada equivalente a un título de sección.
 */
export function flattenVisibleRows(groups: FlattenGroup[]): string[] {
  const ids: string[] = [];
  for (const group of groups) {
    if (group.collapsed) continue;
    for (const row of group.rows) flattenRow(row, ids);
  }
  return ids;
}

function flattenRow(row: FlattenRow, ids: string[]): void {
  ids.push(row.id);
  if (row.collapsed || !row.children) return;
  for (const child of row.children) flattenRow(child, ids);
}
