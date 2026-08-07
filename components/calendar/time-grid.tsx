"use client";

import { useEffect, useRef, useState } from "react";
import { es } from "date-fns/locale";
import { differenceInMinutes, format, parseISO } from "date-fns";
import { useDroppable } from "@dnd-kit/core";
import type { AppContextMenuEntry } from "@/components/primitives/context-menu";
import { currentTimeMinutes, layoutTimedBlocksForDay } from "@/lib/calendar/layout";
import { clampMinutes, pixelsToMinutes, snapToQuarterHour, SNAP_MINUTES, DAY_MINUTES } from "@/lib/calendar/drag";
import { todayInTimeZone } from "@/lib/dates/today";
import type { CalendarBlock } from "@/lib/calendar/block";
import { cn } from "@/lib/utils";
import { DraggableTimedBlock } from "./draggable-timed-block";
import { dayColumnsTemplate, GRID_HEIGHT_PX, GUTTER_WIDTH_PX, HEADER_ROW_HEIGHT_PX, HOUR_ROW_HEIGHT_PX } from "./grid-metrics";
import type { DragResult } from "@/lib/calendar/drag";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * Cada cuánto avanza la línea de la hora actual (tarea 1.1, defecto: hoy
 * se congela para siempre). Cada segundo sería desperdicio: la grilla mide
 * `HOUR_ROW_HEIGHT_PX` (72px) por hora, así que un minuto entero mueve la
 * línea poco más de un píxel (72/60 = 1.2px) — no hay nada que renderizar de
 * más seguido que eso. Un minuto es además la unidad natural del reloj que
 * se muestra (`formatHourLabel` no tiene segundos), así que no se pierde
 * precisión visible eligiendo este intervalo.
 */
const LIVE_CLOCK_INTERVAL_MS = 60_000;

/** Prefijo del `id` de una columna de día, usada como `droppable` (tarea 6.1/6.6): el destino de "mover un bloque" y de "programar un chip de hábito". */
export const DAY_DROPPABLE_PREFIX = "calendar-day:";

function formatHourLabel(hour: number, timeFormat: 12 | 24): string {
  if (timeFormat === 24) return `${String(hour).padStart(2, "0")}:00`;
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour} ${hour < 12 ? "a. m." : "p. m."}`;
}

function minutesToPercent(minutes: number): number {
  return (minutes / DAY_MINUTES) * 100;
}

/**
 * Una columna de día (tarea 6.1/6.2/6.7): dibuja los bloques con horario
 * de ese día, es un `droppable` de `@dnd-kit` para recibir un bloque
 * movido o un chip de hábito programado, y escucha el puntero sobre su
 * propio fondo vacío para "arrastrar sobre espacio vacío" (D-F: esta
 * selección es geometría de la grilla, no sabe todavía si el resultado va
 * a ser una tarea o un evento — eso lo pregunta `CalendarView` después).
 */
function DayColumn({
  dateKey,
  gridColumn,
  blocks,
  timezone,
  nowMinutes,
  origin,
  destination,
  onSelectBlock,
  onToggleComplete,
  onResizeBlock,
  getContextMenuEntries,
  onCreateRange,
}: {
  dateKey: string;
  gridColumn: number;
  blocks: CalendarBlock[];
  timezone: string;
  nowMinutes: number | null;
  /** Hueco de origen del bloque que se está arrastrando, si es en este día (tarea 4.3, D-C): ver el comentario largo de `TimeGrid` sobre `dragOrigin`. */
  origin?: { startMinutes: number; endMinutes: number } | null;
  /** Sombra de destino, si es en este día (reporte "falta la sombra del destino"): ver el comentario largo de `TimeGrid` sobre `dragDestination`. */
  destination?: { startMinutes: number; endMinutes: number } | null;
  onSelectBlock?: (block: CalendarBlock) => void;
  onToggleComplete?: (block: CalendarBlock) => void;
  onResizeBlock?: (block: CalendarBlock, range: DragResult) => void;
  /** Clic derecho (grupo 7, D-E): resuelto por quien monta la pantalla, según el tipo de bloque (D-F, esta grilla no sabe de dominios). */
  getContextMenuEntries?: (block: CalendarBlock) => AppContextMenuEntry[];
  onCreateRange?: (dateKey: string, startMinutes: number, endMinutes: number) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `${DAY_DROPPABLE_PREFIX}${dateKey}`, data: { dateKey } });
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ startMinutes: number; endMinutes: number } | null>(null);

  const positioned = layoutTimedBlocksForDay(blocks, dateKey, timezone);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Solo si el gesto empieza directamente sobre el fondo vacío: sobre un
    // bloque existente, este pointerdown nunca llega acá porque el bloque
    // (o su manija de redimensionar) ya llamó a `stopPropagation` o es el
    // target real del evento.
    const createRange = onCreateRange;
    if (event.target !== event.currentTarget || !createRange) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const startMinutes = clampMinutes(snapToQuarterHour(pixelsToMinutes(event.clientY - rect.top, HOUR_ROW_HEIGHT_PX)), 0, DAY_MINUTES - SNAP_MINUTES);
    setSelection({ startMinutes, endMinutes: startMinutes + SNAP_MINUTES });

    function handleMove(moveEvent: PointerEvent) {
      const rawMinutes = pixelsToMinutes(moveEvent.clientY - rect.top, HOUR_ROW_HEIGHT_PX);
      const endMinutes = clampMinutes(snapToQuarterHour(rawMinutes), startMinutes + SNAP_MINUTES, DAY_MINUTES);
      setSelection({ startMinutes, endMinutes });
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setSelection((current) => {
        // `createRange` ya se verificó no nulo antes de registrar estos
        // listeners; TS no propaga esa verificación dentro de una función
        // anidada, aunque la variable sea `const`.
        if (current) createRange!(dateKey, current.startMinutes, current.endMinutes);
        return null;
      });
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        containerRef.current = node;
      }}
      onPointerDown={handlePointerDown}
      className="relative border-r border-border"
      style={{
        gridColumn,
        gridRow: 2,
        height: GRID_HEIGHT_PX,
        backgroundImage: "repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent 100%)",
        backgroundSize: `100% ${HOUR_ROW_HEIGHT_PX}px`,
      }}
    >
      {positioned.map((segment) => {
        // Solo se ofrece arrastre/redimensionado cuando el segmento visible
        // representa el bloque entero (mismo criterio que D-F: la grilla no
        // sabe de dominios, pero sí sabe distinguir un bloque recortado por
        // la medianoche de uno completo, con su propia geometría). Un
        // bloque que cruza la medianoche sigue viéndose y seleccionándose,
        // solo no se arrastra desde acá — D-G ya cubre "mover de horario"
        // con el selector de fecha y hora.
        const blockDurationMinutes = differenceInMinutes(parseISO(segment.block.end), parseISO(segment.block.start));
        const isFullBlock = segment.endMinutes - segment.startMinutes === blockDurationMinutes;

        return (
          <DraggableTimedBlock
            key={`${segment.block.id}-${segment.dateKey}`}
            block={segment.block}
            segment={segment}
            timezone={timezone}
            onSelectBlock={onSelectBlock}
            onToggleComplete={onToggleComplete}
            onResizeBlock={onResizeBlock}
            contextMenuEntries={getContextMenuEntries?.(segment.block)}
            disabled={!isFullBlock}
          />
        );
      })}

      {selection && (
        <div
          className="pointer-events-none absolute right-0 left-0 z-10 rounded-md border-2 border-dashed border-primary bg-primary/10"
          style={{ top: `${minutesToPercent(selection.startMinutes)}%`, height: `${minutesToPercent(selection.endMinutes - selection.startMinutes)}%` }}
        />
      )}

      {origin && (
        // Sombra en el origen (tarea 4.3, D-C): el nodo original del bloque
        // que se arrastra queda invisible (`draggable-timed-block.tsx`,
        // `isDragging && "opacity-0"`) — sin esto, soltar en el lugar
        // equivocado no tendría ninguna referencia de dónde estaba. Color
        // neutro (`muted-foreground`), distinto del `primary` de `selection`
        // de arriba: uno marca "de acá salió", el otro "esto se va a crear".
        <div
          className="pointer-events-none absolute right-0 left-0 z-10 rounded-md border-2 border-dashed border-muted-foreground/50 bg-muted-foreground/10"
          style={{ top: `${minutesToPercent(origin.startMinutes)}%`, height: `${minutesToPercent(origin.endMinutes - origin.startMinutes)}%` }}
        />
      )}

      {destination && (
        // Sombra en el destino (reporte "falta la sombra del destino
        // mientras se arrastra"): dónde quedaría el bloque si se suelta
        // ahora, recalculada en cada `handleDragMove` de `calendar-view.tsx`
        // — se mueve con el gesto, incluso a otra columna. Borde sólido en
        // `info` (no punteado): así se distingue tanto del hueco de origen
        // de arriba (punteado, neutro) como de la selección para crear un
        // bloque nuevo (punteada, `primary`) — un color y un trazo que este
        // componente todavía no usaba para nada más.
        <div
          className="pointer-events-none absolute right-0 left-0 z-10 rounded-md border-2 border-info bg-info/10"
          style={{ top: `${minutesToPercent(destination.startMinutes)}%`, height: `${minutesToPercent(destination.endMinutes - destination.startMinutes)}%` }}
        />
      )}

      {nowMinutes !== null && (
        <div className="pointer-events-none absolute right-0 left-0 z-10" style={{ top: `${minutesToPercent(nowMinutes)}%` }}>
          {/* Roja, distinta de cualquier color que pueda tener un bloque
              (tarea 1.3): el rojo de marca (`#EC1E2A`) está reservado a la
              marca y a prioridad Urgente (D5, `docs/decisions.md`) — "ningún
              otro significado puede usar rojo". `destructive`/`error` es el
              rojo que sí queda libre para cualquier otro significado (D5 lo
              define para error de formulario y acción destructiva; acá es
              "marca del reloj", ninguno de los dos, pero es el mismo motivo:
              un rojo que no compite con Urgente). No es un chip, así que no
              hay bloque con el que pueda confundirse por color. */}
          <div className="absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full bg-destructive" />
          <div className="border-t-2 border-destructive" />
        </div>
      )}
    </div>
  );
}

/**
 * Grilla de 24 horas (tarea 5.1, arrastre sumado en el grupo 6): un
 * `display: grid` con la columna de horas y una columna por día visible,
 * mismo `grid-template-columns` que `all-day-row.tsx` (`grid-metrics.ts`).
 * Encabezados y columna de horas quedan `sticky` dentro del único
 * contenedor con scroll, así no hace falta sincronizar el scroll de dos
 * elementos a mano.
 *
 * `now` es obligatorio y sin default propio (mismo principio que
 * `lib/dates/today.ts`: "ahora" viaja explícito, nunca `new Date()`
 * implícito): la posición de la línea de la hora actual depende de un
 * valor continuo, así que un default evaluado en el módulo produciría un
 * valor distinto en el render de servidor y en la hidratación del cliente
 * — quien monta la pantalla es quien tiene que resolver ese reloj una sola
 * vez (por ejemplo, recién después de montar, como `hooks/use-media-query.ts`).
 *
 * `onMoveBlock`/`onResizeBlock`/`onCreateRange` son opcionales y sin
 * comportamiento por defecto (D-F): esta grilla nunca decide qué mutación
 * corresponde, solo entrega el resultado geométrico a quien la usa.
 *
 * `dragOrigin`/`dragDestination` (tarea 4.3, D-C, `dragDestination` sumado
 * por el reporte "falta la sombra del destino"): mientras `calendar-view.tsx`
 * arrastra un bloque o un chip de hábito, ahí guarda de qué día y qué rango
 * salió, y a qué día y qué rango se movería si se soltara ahora — acá solo
 * se compara `dateKey` para decidir en qué columna dibujar cada sombra
 * (`DayColumn`), esta grilla sigue sin saber nada de cómo se calculó.
 */
export function TimeGrid({
  visibleDays,
  blocks,
  previewBlocks = [],
  timezone,
  now,
  timeFormat = 24,
  dragOrigin = null,
  dragDestination = null,
  onSelectBlock,
  onToggleComplete,
  onResizeBlock,
  getContextMenuEntries,
  onCreateRange,
}: {
  visibleDays: string[];
  blocks: CalendarBlock[];
  previewBlocks?: CalendarBlock[];
  timezone: string;
  now: Date;
  timeFormat?: 12 | 24;
  dragOrigin?: { dateKey: string; startMinutes: number; endMinutes: number } | null;
  dragDestination?: { dateKey: string; startMinutes: number; endMinutes: number } | null;
  onSelectBlock?: (block: CalendarBlock) => void;
  onToggleComplete?: (block: CalendarBlock) => void;
  onResizeBlock?: (block: CalendarBlock, range: DragResult) => void;
  /** Clic derecho (grupo 7, D-E): resuelto por quien monta la pantalla, según el tipo de bloque (D-F, esta grilla no sabe de dominios). */
  getContextMenuEntries?: (block: CalendarBlock) => AppContextMenuEntry[];
  onCreateRange?: (dateKey: string, startMinutes: number, endMinutes: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = todayInTimeZone(now, timezone);
  const merged = blocks.concat(previewBlocks.map((block) => ({ ...block, isPreview: true })));

  // La línea de la hora actual se movía nunca (tarea 1.1/1.2, requisito
  // incumplido desde siempre): `now` llega congelado a propósito desde
  // `screen-calendar.tsx` (ver su comentario largo) para que la hidratación
  // no compare dos instantes distintos entre servidor y cliente. Ese
  // congelamiento no se toca acá: el reloj que sí avanza vive adentro de
  // este componente, que ya solo existe del lado del cliente y después de
  // montado (la pantalla no renderiza `TimeGrid` hasta que `now` deja de
  // ser `null`), así que no hay ningún primer render de servidor con el que
  // desajustarse. `liveNow` arranca en `now` (por eso no hace falta
  // resincronizarlo si `now` cambiara: en la arquitectura actual no lo
  // hace mientras este componente sigue montado, `screen-calendar.tsx`
  // lo resuelve una única vez) y después solo lo mueve el intervalo —
  // nunca se lee `new Date()` durante el render.
  const [liveNow, setLiveNow] = useState(now);
  useEffect(() => {
    const id = setInterval(() => setLiveNow(new Date()), LIVE_CLOCK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const minutesNow = currentTimeMinutes(now, visibleDays[0] ?? today, timezone);
    const targetMinutes = Math.max((minutesNow ?? 7 * 60) - 120, 0);
    container.scrollTop = HEADER_ROW_HEIGHT_PX + (targetMinutes / (24 * 60)) * GRID_HEIGHT_PX;
    // Solo al montar: no queremos pelear con el scroll manual del usuario en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
      <div className="grid" style={{ gridTemplateColumns: dayColumnsTemplate(visibleDays.length) }}>
        <div
          className="sticky top-0 left-0 z-30 border-r border-b border-border bg-background"
          style={{ gridColumn: 1, gridRow: 1, width: GUTTER_WIDTH_PX, height: HEADER_ROW_HEIGHT_PX }}
        />

        {visibleDays.map((dateKey, index) => {
          const isToday = dateKey === today;
          return (
            <div
              key={`header-${dateKey}`}
              className={cn(
                "sticky top-0 z-20 flex items-center justify-center border-b border-border bg-background px-1 text-xs capitalize",
                isToday ? "font-semibold text-primary" : "text-muted-foreground",
              )}
              style={{ gridColumn: index + 2, gridRow: 1, height: HEADER_ROW_HEIGHT_PX }}
            >
              {format(parseISO(dateKey), "EEE d", { locale: es })}
            </div>
          );
        })}

        <div
          className="sticky left-0 z-10 border-r border-border bg-background text-right text-[0.7rem] text-muted-foreground"
          style={{ gridColumn: 1, gridRow: 2, width: GUTTER_WIDTH_PX, height: GRID_HEIGHT_PX }}
        >
          {HOURS.map((hour) => (
            <div key={hour} className="-translate-y-2 pr-2" style={{ height: HOUR_ROW_HEIGHT_PX }}>
              {formatHourLabel(hour, timeFormat)}
            </div>
          ))}
        </div>

        {visibleDays.map((dateKey, index) => (
          <DayColumn
            key={`day-${dateKey}`}
            dateKey={dateKey}
            gridColumn={index + 2}
            blocks={merged}
            timezone={timezone}
            nowMinutes={currentTimeMinutes(liveNow, dateKey, timezone)}
            origin={dragOrigin && dragOrigin.dateKey === dateKey ? dragOrigin : null}
            destination={dragDestination && dragDestination.dateKey === dateKey ? dragDestination : null}
            onSelectBlock={onSelectBlock}
            onToggleComplete={onToggleComplete}
            onResizeBlock={onResizeBlock}
            getContextMenuEntries={getContextMenuEntries}
            onCreateRange={onCreateRange}
          />
        ))}
      </div>
    </div>
  );
}
