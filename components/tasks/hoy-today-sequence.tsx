"use client";

import { useEffect, useState, type ReactNode } from "react";
import { formatTimeLabel } from "@/lib/dates/format";
import { todayInTimeZone } from "@/lib/dates/today";
import { findNowMarkerIndex, type HoySequenceEntry, type HoySequenceEvent } from "@/lib/tasks/hoy-sequence";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { TaskRow } from "./task-row";

/** Igual criterio que `LIVE_CLOCK_INTERVAL_MS` de `components/calendar/time-grid.tsx`: un minuto es la unidad más fina que se muestra (sin segundos), no hay nada que ganar actualizando más seguido. */
const LIVE_CLOCK_INTERVAL_MS = 60_000;

/**
 * Marca de "ahora" entre las tareas de la vista Hoy, modo lista (pedido del
 * dueño, "no sé qué hora es actualmente. Para tener referencia"): un `<li>`
 * real dentro de la lista (no un `<div>` suelto — le rompería la semántica
 * de lista a un lector de pantalla), con la hora visible y un texto para
 * lectores de pantalla que no está en el resto de la fila. Las reglas
 * horizontales son puro adorno visual (`aria-hidden`).
 *
 * Mismo token que la línea de la hora actual del calendario
 * (`time-grid.tsx`): `destructive`, no el rojo de marca ni `primary`.
 */
function NowMarker({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-2 py-1">
      <span aria-hidden className="h-px flex-1 bg-destructive/40" />
      <span className="shrink-0 text-xs font-medium text-destructive">
        <span className="sr-only">Hora actual: </span>
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-destructive/40" />
    </li>
  );
}

/**
 * Secuencia de "Hoy" en modo lista, con la marca de "ahora" en su posición
 * cronológica (pedido del dueño, ver `NowMarker`). Componente propio, chico
 * y aislado (extraído de `hoy-view.tsx`) por blast radius de re-render:
 * `HoyView` es grande (atrasadas, después, panel, DnD…) y no tiene sentido
 * que todo ese árbol se re-renderice cada minuto solo por el tic del reloj
 * — acá adentro vive el único estado que cambia con el tiempo.
 *
 * Hidratación: mismo patrón que `TimeGrid` (`components/calendar/time-grid.tsx`).
 * `now` llega como prop fija (derivada de `nowIso`, nunca `new Date()`
 * directo), así que el primer render en servidor y en cliente coinciden;
 * recién después de montar, el intervalo mueve `liveNow`. No hace falta el
 * gate `useMounted` que usa `screen-calendar.tsx` un nivel más arriba: acá
 * ya partimos de un `now` fijo por prop, no de un reloj sin resolver.
 *
 * Tanto la posición de la marca como su texto salen del mismo `liveNow`: si
 * derivaran de relojes distintos, la posición podría quedar vieja aunque el
 * texto ya haya avanzado (mentira posicional, no solo de texto).
 *
 * `todayDate` es la misma red de seguridad barata que usa `currentTimeMinutes`
 * del calendario (`lib/calendar/layout.ts`): aunque hoy no exista forma de
 * navegar a otro día en esta pantalla, si el día calendario de `liveNow` en
 * `timezone` dejara de ser `todayDate` (por ejemplo, cruzando la medianoche
 * con la pestaña abierta), la marca deja de mostrarse en vez de mentir.
 */
export function HoyTodaySequence<TEvent extends HoySequenceEvent>({
  mixedSequence,
  renderEventRow,
  tasks,
  todaySequenceTaskIds,
  timezone,
  timeFormat,
  todayDate,
  now,
}: {
  mixedSequence: HoySequenceEntry<TaskRowData, TEvent>[];
  renderEventRow: (event: TEvent) => ReactNode;
  tasks: TaskRowData[];
  todaySequenceTaskIds: string[];
  timezone: string;
  timeFormat: 12 | 24;
  todayDate: string;
  now: Date;
}) {
  const [liveNow, setLiveNow] = useState(now);
  useEffect(() => {
    const id = setInterval(() => setLiveNow(new Date()), LIVE_CLOCK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const stillToday = todayInTimeZone(liveNow, timezone) === todayDate;
  const markerIndex = stillToday ? findNowMarkerIndex(mixedSequence, liveNow) : null;
  const marker = markerIndex !== null ? <NowMarker key="now-marker" label={formatTimeLabel(liveNow, timezone, timeFormat)} /> : null;

  const items: ReactNode[] = [];
  mixedSequence.forEach((entry, index) => {
    if (index === markerIndex) items.push(marker);
    items.push(
      entry.kind === "event" ? (
        renderEventRow(entry.event)
      ) : (
        <TaskRow
          key={entry.task.id}
          task={entry.task}
          allTasks={tasks}
          siblings={[]}
          depth={0}
          variant="flat"
          selectionOrderIds={todaySequenceTaskIds}
          showProject
        />
      ),
    );
  });
  if (markerIndex === mixedSequence.length) items.push(marker);

  return <ul className="flex flex-col divide-y divide-border/60">{items}</ul>;
}
