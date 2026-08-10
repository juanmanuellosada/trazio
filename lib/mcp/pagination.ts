/**
 * Paginación de las herramientas de lectura del servidor MCP (Ola 6 de
 * `servidor-mcp`, tarea 6.2, D-I de `design.md`): Vercel corta el cuerpo de
 * una respuesta en 4,5 MB, así que ninguna herramienta que devuelva una
 * colección puede traer todo sin límite — es requisito de diseño, no una
 * mejora futura.
 *
 * Mecanismo: offset + límite, con tope por defecto conservador. Cada
 * consulta pide una fila más de las que va a devolver (ver `fetchRange`) —
 * si vuelven `pageSize + 1` filas, `buildPage` recorta a `pageSize` e
 * informa que quedó cortado, sin necesitar una segunda consulta de conteo.
 * El cursor es el offset como string: opaco para quien lo use, estable
 * mientras nadie reordene la colección entre una página y la siguiente.
 */
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export function resolvePageSize(limite: number | undefined): number {
  if (limite === undefined || !Number.isFinite(limite)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(1, Math.trunc(limite)), MAX_PAGE_SIZE);
}

export function resolveOffset(cursor: string | undefined): number {
  if (!cursor) return 0;
  const parsed = Number(cursor);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

/** Rango inclusive para `.range()` de PostgREST: `pageSize + 1` filas. */
export function fetchRange(offset: number, pageSize: number): [number, number] {
  return [offset, offset + pageSize];
}

export type Page<T> = { items: T[]; truncated: boolean; nextCursor: string | null };

export function buildPage<T>(rows: T[], offset: number, pageSize: number): Page<T> {
  const truncated = rows.length > pageSize;
  const items = truncated ? rows.slice(0, pageSize) : rows;
  return { items, truncated, nextCursor: truncated ? String(offset + pageSize) : null };
}
