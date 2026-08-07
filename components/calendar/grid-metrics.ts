/**
 * Medidas compartidas entre `all-day-row.tsx` y `time-grid.tsx`: las dos
 * arman su propio `grid-template-columns` en CSS Grid, y tienen que
 * coincidir para que la columna del lunes de una quede debajo de la
 * columna del lunes de la otra. Vive en su propio módulo para que ninguna
 * de las dos tenga que importar de la otra.
 */
export const GUTTER_WIDTH_PX = 56;
export const DAY_COLUMN_MIN_WIDTH_PX = 112;
export const HOUR_ROW_HEIGHT_PX = 72;
export const HEADER_ROW_HEIGHT_PX = 32;
export const GRID_HEIGHT_PX = HOUR_ROW_HEIGHT_PX * 24;

export function dayColumnsTemplate(dayCount: number): string {
  return `${GUTTER_WIDTH_PX}px repeat(${dayCount}, minmax(${DAY_COLUMN_MIN_WIDTH_PX}px, 1fr))`;
}
