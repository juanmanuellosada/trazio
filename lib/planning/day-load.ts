/**
 * Cálculo puro del tiempo planificado de un día (capacidad `carga-del-dia`,
 * D-A de `openspec/changes/carga-del-dia/design.md`): recibe duraciones ya
 * resueltas, nunca tareas, hábitos ni eventos. `components/tasks/` tiene
 * prohibido importar de `lib/calendar/`
 * (`lib/calendar/tasks-and-habits-never-publish-to-google.test.ts` lo
 * verifica escaneando esa carpeta), así que este módulo no puede conocer
 * ninguna de las tres fuentes — el único lugar que las junta es
 * `components/calendar/use-day-load.ts`, hermano de `use-hoy-events.ts`.
 *
 * `null` es "sin duración" (D-C): no suma, pero se cuenta aparte para que
 * el total nunca omita elementos en silencio. `0` sí es una duración (una
 * tarea de "0 minutos" existe y entra en el total, aunque no le sume nada)
 * — no es lo mismo que ausente.
 */

export type DayLoadItem = { durationMinutes: number | null };

export type DayLoad = { totalMinutes: number; withoutDuration: number };

export function computeDayLoad(items: DayLoadItem[]): DayLoad {
  let totalMinutes = 0;
  let withoutDuration = 0;
  for (const item of items) {
    if (item.durationMinutes === null) withoutDuration += 1;
    else totalMinutes += item.durationMinutes;
  }
  return { totalMinutes, withoutDuration };
}

/**
 * "5h 20m", "45m", "2h" (D-F): sin ceros a la izquierda, sin minutos cuando
 * las horas son exactas. Solo se llama con `minutes > 0` — el "0m" que D-C
 * prohíbe nunca llega acá, `formatDayLoad` lo corta antes.
 */
function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Texto final del encabezado (D-C, D-B): "5h 20m planificadas", con
 * "· N sin duración" cuando algo quedó sin medir, o solo el conteo cuando
 * nada tiene duración — nunca "0m planificadas". `includesOverdue` agrega
 * la aclaración de D-B cuando el total (siempre en Hoy, nunca en Próximos)
 * suma tareas atrasadas. `null` cuando no hay absolutamente nada que
 * informar (el día no tiene ningún elemento).
 */
export function formatDayLoad(load: DayLoad, includesOverdue = false): string | null {
  const { totalMinutes, withoutDuration } = load;
  if (totalMinutes === 0 && withoutDuration === 0) return null;
  if (totalMinutes === 0) return `${withoutDuration} sin duración`;

  const overdueSuffix = includesOverdue ? " (incluye atrasadas)" : "";
  const withoutSuffix = withoutDuration > 0 ? ` · ${withoutDuration} sin duración` : "";
  return `${formatMinutes(totalMinutes)} planificadas${overdueSuffix}${withoutSuffix}`;
}
