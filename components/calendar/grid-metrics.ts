/**
 * Medidas compartidas entre `all-day-row.tsx` y `time-grid.tsx`: las dos
 * arman su propio `grid-template-columns` en CSS Grid, y tienen que
 * coincidir para que la columna del lunes de una quede debajo de la
 * columna del lunes de la otra. Vive en su propio módulo para que ninguna
 * de las dos tenga que importar de la otra.
 */
export const GUTTER_WIDTH_PX = 56;
export const DAY_COLUMN_MIN_WIDTH_PX = 112;
/**
 * Pedido del dueño ("todavía me parece muy angosto las tareas de 15 min"):
 * subida de 48 a 72 (commit anterior) no alcanzó. 96 no es arbitrario: a
 * 96px/hora, un bloque de 15 minutos mide 24px, exactamente
 * `TIGHT_HEIGHT_THRESHOLD_PX` de `calendar-block-chip.tsx` — el bloque de
 * 15 minutos del paso mínimo de la grilla deja de caer en modo apretado
 * (`isTight`) y pasa a mostrarse con el padding y la tipografía normales.
 * Costo: el día pasa de 1728px a 2304px de alto, el doble del original
 * (48px/hora).
 */
export const HOUR_ROW_HEIGHT_PX = 96;
export const HEADER_ROW_HEIGHT_PX = 32;
export const GRID_HEIGHT_PX = HOUR_ROW_HEIGHT_PX * 24;

export function dayColumnsTemplate(dayCount: number): string {
  return `${GUTTER_WIDTH_PX}px repeat(${dayCount}, minmax(${DAY_COLUMN_MIN_WIDTH_PX}px, 1fr))`;
}
