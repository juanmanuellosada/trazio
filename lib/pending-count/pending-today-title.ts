const PENDING_COUNT_PREFIX = /^\(\d+\)\s*/;

/**
 * Antepone `(N) ` al título del documento cuando hay pendientes, y lo saca
 * cuando no (spec "El título del documento lleva la cantidad de
 * pendientes", cambio `pendientes-en-el-icono-y-el-titulo`). Primero quita
 * cualquier prefijo de conteo que ya estuviera puesto, para no acumular
 * `(3) (3) Trazio` al reaplicarse — pasa cada minuto (refetch del conteo) y
 * en cada cambio de ruta (`use-pending-today-sync.ts`). No asume un título
 * base fijo ("Trazio"): lo que sigue después del prefijo es lo que el
 * `metadata` de la ruta actual haya puesto (por ejemplo, el título de una
 * tarea en `/tarea/[id]`), y ese resto queda intacto.
 */
export function applyPendingCountToTitle(title: string, count: number): string {
  const base = title.replace(PENDING_COUNT_PREFIX, "");
  return count > 0 ? `(${count}) ${base}` : base;
}
