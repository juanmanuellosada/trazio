/**
 * Cálculo puro del tiempo planificado de un día (capacidad `carga-del-dia`,
 * D-A de `openspec/changes/carga-del-dia/design.md`; separado en
 * comprometido/pedido sin lugar por `el-dia-que-entra` D-B): recibe
 * duraciones ya resueltas, nunca tareas, hábitos ni eventos.
 * `components/tasks/` tiene prohibido importar de `lib/calendar/`
 * (`lib/calendar/tasks-and-habits-never-publish-to-google.test.ts` lo
 * verifica escaneando esa carpeta), así que este módulo no puede conocer
 * ninguna de las tres fuentes — el único lugar que las junta es
 * `components/calendar/use-free-gaps.ts`, hermano de `use-hoy-events.ts`.
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
 * las horas son exactas. Exportada porque `que-hago-ahora`
 * (`components/calendar/que-hago-ahora-button.tsx`) también necesita
 * mostrar una duración con este mismo formato, para la tarea propuesta.
 *
 * Redondea antes de mostrar (`el-dia-que-entra`): `sumGapMinutes`
 * (`lib/planning/free-gaps.ts`) resta instantes reales, así que el tiempo
 * libre casi nunca cae en un minuto exacto — "ahora" trae segundos. La
 * aritmética interna se queda exacta (el redondeo solo es cosmético, para
 * mostrar); el aviso de "no entra" sigue comparando los minutos sin
 * redondear.
 */
export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Texto de Próximos (capacidad `carga-del-dia`, sin tocar por
 * `el-dia-que-entra`: un día futuro no tiene un "ahora" del que restar, así
 * que "cuánto suma ese día" sigue siendo la pregunta correcta ahí, ver
 * `design.md`): "5h 20m planificadas", con "· N sin duración" cuando algo
 * quedó sin medir, o solo el conteo cuando nada tiene duración — nunca "0m
 * planificadas". `includesOverdue` agrega la aclaración cuando el total
 * suma tareas atrasadas. `null` cuando no hay absolutamente nada que
 * informar (el día no tiene ningún elemento). Hoy usa `formatCargaDelDia`
 * en su lugar, más abajo.
 */
export function formatDayLoad(load: DayLoad, includesOverdue = false): string | null {
  const { totalMinutes, withoutDuration } = load;
  if (totalMinutes === 0 && withoutDuration === 0) return null;
  if (totalMinutes === 0) return `${withoutDuration} sin duración`;

  const overdueSuffix = includesOverdue ? " (incluye atrasadas)" : "";
  const withoutSuffix = withoutDuration > 0 ? ` · ${withoutDuration} sin duración` : "";
  return `${formatMinutes(totalMinutes)} planificadas${overdueSuffix}${withoutSuffix}`;
}

/**
 * Tiempo libre restante del día (`computeFreeGaps`/`sumGapMinutes` de
 * `lib/planning/free-gaps.ts`, ya clampeado a cero cuando el día terminó) más
 * el pedido sin lugar — lo pendiente sin hora, calculado con `computeDayLoad`
 * sobre esa sola clasificación (D-B de `el-dia-que-entra/design.md`: el
 * cálculo de `computeDayLoad` no cambia, solo deja de ser lo único que se
 * muestra).
 */
export type FreeTimeSummary = { freeMinutes: number; dayEnded: boolean; unassigned: DayLoad };

/**
 * "2h 15m de tareas sin agendar", o "4 tareas sin duración estimada" cuando
 * nada de lo sin agendar tiene con qué medirse (D-E: nunca "0m"). `null`
 * cuando no hay absolutamente nada pedido sin lugar.
 */
function unassignedClause({ totalMinutes, withoutDuration }: DayLoad): string | null {
  if (totalMinutes === 0 && withoutDuration === 0) return null;
  if (totalMinutes === 0) return withoutDuration === 1 ? "1 tarea sin duración estimada" : `${withoutDuration} tareas sin duración estimada`;
  const withoutSuffix = withoutDuration > 0 ? ` (y ${withoutDuration} sin duración)` : "";
  return `${formatMinutes(totalMinutes)} de tareas sin agendar${withoutSuffix}`;
}

/**
 * Texto final del encabezado de Hoy (`carga-del-dia`, requirement "El día
 * muestra cuánto tiempo suma lo planificado" de `el-dia-que-entra`): "Te
 * quedan 3h 40m libres y 2h 15m de tareas sin agendar", sin color de alerta
 * ni ícono nunca (D61) — el aviso de que lo pedido no entra es una frase
 * más, no un tratamiento visual distinto.
 */
export function formatCargaDelDia(summary: FreeTimeSummary): string {
  const unassigned = unassignedClause(summary.unassigned);

  if (summary.dayEnded) {
    return unassigned ? `El día ya terminó, pero te quedan ${unassigned}.` : "El día ya terminó.";
  }

  const freeText = `Te quedan ${formatMinutes(summary.freeMinutes)} libres`;
  if (!unassigned) return `${freeText}.`;

  const warning = summary.unassigned.totalMinutes > summary.freeMinutes ? " No te entra todo en lo que queda." : "";
  return `${freeText} y ${unassigned}.${warning}`;
}
