"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { es } from "date-fns/locale";
import { differenceInMinutes, format, parseISO } from "date-fns";
import { useDroppable } from "@dnd-kit/core";
import type { AppContextMenuEntry } from "@/components/primitives/context-menu";
import { CONTINUOUS_RANGE_DAYS, currentTimeMinutes, dateAtOffsetFromToday, layoutTimedBlocksForDay, TOTAL_CONTINUOUS_DAYS } from "@/lib/calendar/layout";
import { clampMinutes, pixelsToMinutes, snapToQuarterHour, SNAP_MINUTES, DAY_MINUTES } from "@/lib/calendar/drag";
import { todayInTimeZone } from "@/lib/dates/today";
import type { CalendarBlock } from "@/lib/calendar/block";
import { cn } from "@/lib/utils";
import { AllDayRow } from "./all-day-row";
import { DraggableTimedBlock } from "./draggable-timed-block";
import {
  COLUMN_WIDTH_CSS_VAR,
  dayColumnsTemplate,
  GRID_HEIGHT_PX,
  GUTTER_WIDTH_PX,
  HEADER_ROW_HEIGHT_PX,
  HOUR_ROW_HEIGHT_PX,
  useMeasuredColumnWidthPx,
} from "./grid-metrics";
import { useContinuousScroll } from "./use-continuous-scroll";
import type { DragResult } from "@/lib/calendar/drag";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * Crear un bloque en táctil pide doble toque y arrastrar (pedido del dueño,
 * "en móvil... apenas toco me detecta que quiero crear algo. El crear algo
 * tiene que ser con doble toque y arrastrar"): un solo toque sobre el fondo
 * vacío no debe arrancar nada — tiene que dejar pasar el scroll nativo tal
 * cual, sin ningún efecto (ni `setState`, ni `preventDefault`, ni
 * `touch-action`). Con mouse y lápiz no cambia nada (`event.pointerType`,
 * nunca detección de dispositivo una sola vez al cargar): un solo botonazo
 * sigue arrancando la selección, como siempre.
 *
 * Ventana entre los dos toques: 400ms — más que el "doble tap" típico de
 * Android (~300ms, `ViewConfiguration.getDoubleTapTimeout()`), para que uno
 * lento no falle (pedido explícito), sin llegar a confundirse con dos
 * toques deliberadamente separados.
 */
const DOUBLE_TAP_WINDOW_MS = 400;
/** Distancia entre los dos toques: bastante más que el temblor de un dedo, bastante menos que una fila de la grilla (`HOUR_ROW_HEIGHT_PX`, 96px), para que "cerca" siga significando "el mismo lugar". */
const DOUBLE_TAP_DISTANCE_PX = 40;
/** Cuánto se puede mover el dedo entre bajar y levantar para que un toque cuente como toque, no como el arranque de un scroll (mismo orden que el "touch slop" de Android, ~8-10px): si se movió más, no queda pendiente para el próximo doble toque. */
const TAP_MOVEMENT_TOLERANCE_PX = 10;

type PendingTap = { x: number; y: number; time: number };

/**
 * Cada cuánto avanza la línea de la hora actual (tarea 1.1, defecto: hoy
 * se congela para siempre). Cada segundo sería desperdicio: la grilla mide
 * `HOUR_ROW_HEIGHT_PX` (96px) por hora, así que un minuto entero mueve la
 * línea poco más de un píxel (96/60 = 1.6px) — no hay nada que renderizar de
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
  // Toque pendiente de convertirse en el primero de un doble toque (ver el
  // comentario de `DOUBLE_TAP_WINDOW_MS`): un `ref`, no estado — no debe
  // disparar un re-render, y el gesto de mouse/lápiz no lo toca nunca.
  const pendingTapRef = useRef<PendingTap | null>(null);

  const positioned = layoutTimedBlocksForDay(blocks, dateKey, timezone);

  /** Arranca la selección para crear un bloque: mismo cuerpo que ya tenía `handlePointerDown` antes de sumar el doble toque, ahora compartido entre el camino de mouse/lápiz (un solo botonazo) y el segundo toque de un doble toque táctil. */
  function startSelectionDrag(event: React.PointerEvent<HTMLDivElement> | PointerEvent) {
    const createRange = onCreateRange;
    const container = containerRef.current;
    if (!createRange || !container) return;
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

  /**
   * Deja pendiente un toque táctil que no arrancó nada (el primero de un
   * posible doble toque): sin `preventDefault` ni `setState` acá — el único
   * trabajo es mirar, con oyentes que tampoco llaman a `preventDefault`, si
   * termina siendo un toque de verdad (se levanta cerca de donde bajó,
   * `TAP_MOVEMENT_TOLERANCE_PX`) o el arranque de un scroll (se movió más:
   * no cuenta para el próximo doble toque).
   */
  function trackPendingTap(event: React.PointerEvent<HTMLDivElement>) {
    const downX = event.clientX;
    const downY = event.clientY;
    const downTime = event.timeStamp;
    const pointerId = event.pointerId;

    function clearListeners() {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", clearListeners);
    }
    function handlePointerUp(upEvent: PointerEvent) {
      clearListeners();
      if (upEvent.pointerId !== pointerId) return;
      const movedTooMuch =
        Math.abs(upEvent.clientX - downX) > TAP_MOVEMENT_TOLERANCE_PX || Math.abs(upEvent.clientY - downY) > TAP_MOVEMENT_TOLERANCE_PX;
      pendingTapRef.current = movedTooMuch ? null : { x: downX, y: downY, time: downTime };
    }

    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", clearListeners);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Solo si el gesto empieza directamente sobre el fondo vacío: sobre un
    // bloque existente, este pointerdown nunca llega acá porque el bloque
    // (o su manija de redimensionar) ya llamó a `stopPropagation` o es el
    // target real del evento.
    if (event.target !== event.currentTarget || !onCreateRange) return;

    if (event.pointerType === "touch") {
      const pending = pendingTapRef.current;
      const isDoubleTap =
        pending !== null &&
        event.timeStamp - pending.time <= DOUBLE_TAP_WINDOW_MS &&
        Math.abs(event.clientX - pending.x) <= DOUBLE_TAP_DISTANCE_PX &&
        Math.abs(event.clientY - pending.y) <= DOUBLE_TAP_DISTANCE_PX;

      if (!isDoubleTap) {
        // Primer toque: no arranca nada, deja pasar el scroll nativo tal
        // cual (nada de `preventDefault` acá tampoco).
        trackPendingTap(event);
        return;
      }
      // Segundo toque, cerca y a tiempo del primero: confirmado. Se corta
      // el gesto nativo desde acá (no antes, en el primer toque, que tiene
      // que quedar intacto para que el scroll funcione) para que el
      // navegador no compita por el mismo gesto mientras se arrastra para
      // definir el tamaño del bloque nuevo.
      pendingTapRef.current = null;
      event.preventDefault();
    }

    startSelectionDrag(event);
  }

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        containerRef.current = node;
      }}
      onPointerDown={handlePointerDown}
      // `data-date` (tarea 4/9.3): con la virtualización, varias columnas
      // montadas a la vez comparten la misma clase — sin esto no hay forma
      // de apuntar a la de un día puntual desde un test.
      data-date={dateKey}
      className="relative border-r border-border"
      style={{
        gridColumn,
        gridRow: 3,
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
 *
 * `startDate`/`dayCount` reemplazan a `visibleDays` (tareas 4 y 6,
 * `design.md` decisiones 1 y 5): el desplazamiento es continuo, así que
 * esta grilla ya no recibe la lista exacta de días a dibujar, sino de
 * dónde arranca el tramo visible y cuántos días entran a la vez.
 * Internamente monta esos días más un margen a cada lado
 * (`use-continuous-scroll.ts`, `COLUMN_VIRTUALIZATION_MARGIN_DAYS`) dentro
 * de un único contenedor con `overflow-x`, y reporta hacia arriba
 * (`onVisibleRangeChange`) cuándo el usuario lo corrió con el gesto nativo
 * (arrastre, rueda, inercia táctil) para que quien pide los datos y
 * `anchorDate` se mantengan de acuerdo con lo que se ve.
 */
export function TimeGrid({
  startDate,
  dayCount,
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
  onVisibleRangeChange,
}: {
  /** Primer día del tramo visible (`yyyy-MM-dd`), ya acotado a `CONTINUOUS_RANGE_DAYS` por quien llama (`visibleDaysForFormat`). */
  startDate: string;
  /** Cuántos días entran a la vez: 1, 4 o 7 según el formato (`dayCountForFormat`). */
  dayCount: number;
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
  /** El usuario corrió el desplazamiento continuo (tarea 6.1/6.2): nuevo primer día visible. */
  onVisibleRangeChange?: (startDate: string) => void;
}) {
  // Mismo contenedor para las tres cosas (tarea 2.1/4.1): el que mide su
  // ancho con `ResizeObserver` es el mismo que se usa para el scroll
  // horizontal continuo y para posicionar el scroll vertical inicial.
  const [containerRef, columnWidthPx] = useMeasuredColumnWidthPx(dayCount);
  const today = todayInTimeZone(now, timezone);
  const mountedWindow = useContinuousScroll({ containerRef, today, startDate, dayCount, columnWidthPx, onVisibleRangeChange });
  const mountedDays = useMemo(() => {
    const days: string[] = [];
    for (let index = mountedWindow.startIndex; index <= mountedWindow.endIndex; index++) {
      days.push(dateAtOffsetFromToday(index - CONTINUOUS_RANGE_DAYS, today));
    }
    return days;
  }, [mountedWindow.startIndex, mountedWindow.endIndex, today]);
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
    const container = containerRef.current;
    if (!container) return;
    const minutesNow = currentTimeMinutes(now, startDate, timezone);
    const targetMinutes = Math.max((minutesNow ?? 7 * 60) - 120, 0);
    container.scrollTop = HEADER_ROW_HEIGHT_PX + (targetMinutes / (24 * 60)) * GRID_HEIGHT_PX;
    // Solo al montar: no queremos pelear con el scroll manual del usuario en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `position: sticky; left: 0` no funciona en Chromium para un ítem de
  // CSS Grid ubicado en una sola columna (`gridColumn: 1`) dentro de una
  // grilla que se desplaza horizontalmente de verdad: el elemento queda
  // "pegado" a su posición natural y se va con el contenido en vez de
  // quedarse fijo — verificado en vivo, no es un supuesto (D55,
  // `docs/decisions.md`). Nunca se notó en los bloques 1 a 3 porque
  // entonces el contenedor no tenía overflow horizontal (`columnWidthPx`
  // llenaba el ancho exacto de `dayCount` columnas, `scrollLeft` siempre
  // era 0): recién acá, con la tira continua de verdad, se manifiesta.
  // `position: sticky; top: 0` para el eje vertical sí funciona (headers y
  // fila de todo el día se quedan pegados arriba sin problema) — el arreglo
  // solo hace falta para el eje horizontal: en cada evento de scroll, se
  // corrige a mano con `transform: translateX(scrollLeft)` sobre las tres
  // piezas fijas de la izquierda (la esquina, la columna de horas y el
  // hueco de la fila de todo el día en `all-day-row.tsx`, marcadas con
  // `data-gutter-cell`).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    function syncGutterTransform() {
      const shift = `translateX(${container!.scrollLeft}px)`;
      container!.querySelectorAll<HTMLElement>("[data-gutter-cell]").forEach((cell) => {
        cell.style.transform = shift;
      });
    }
    syncGutterTransform();
    container.addEventListener("scroll", syncGutterTransform, { passive: true });
    return () => container.removeEventListener("scroll", syncGutterTransform);
  }, [containerRef]);

  return (
    <div
      ref={containerRef}
      // `no-scrollbar` (tarea 9.1, `design.md` pregunta abierta): con un año
      // de ancho a cada lado, la barra nativa mostraría un pulgar
      // minúsculo sin ninguna referencia (sin marcas de semana ni mes) —
      // más ruido que ayuda. El gesto de arrastrar/deslizar queda como
      // único medio para desplazarse dentro del año; ir más lejos queda
      // fuera de esta tanda (`design.md`, decisión 3, lo deja para un
      // selector de fecha que todavía no existe en `CalendarNav`).
      className="no-scrollbar min-h-0 flex-1 overflow-auto"
      style={{ [COLUMN_WIDTH_CSS_VAR]: `${columnWidthPx}px` } as React.CSSProperties}
    >
      {/* `TOTAL_CONTINUOUS_DAYS` columnas en total (tarea 4.1, `design.md`
          decisión 3): un año hacia atrás y uno hacia adelante de hoy, para
          que `scrollLeft` tenga un tamaño honesto. Solo se montan las de
          `mountedDays` (lo visible más el margen) — el resto son columnas
          de grilla vacías, sin nodo, que no cuestan nada. */}
      <div className="grid" style={{ gridTemplateColumns: dayColumnsTemplate(TOTAL_CONTINUOUS_DAYS) }}>
        <div
          data-gutter-cell
          className="sticky top-0 z-30 border-r border-b border-border bg-background"
          style={{ gridColumn: 1, gridRow: 1, width: GUTTER_WIDTH_PX, height: HEADER_ROW_HEIGHT_PX }}
        />

        {mountedDays.map((dateKey, offset) => {
          const isToday = dateKey === today;
          return (
            <div
              key={`header-${dateKey}`}
              className={cn(
                "sticky top-0 z-20 flex items-center justify-center border-b border-border bg-background px-1 text-xs capitalize",
                isToday ? "font-semibold text-primary" : "text-muted-foreground",
              )}
              style={{ gridColumn: mountedWindow.startIndex + offset + 2, gridRow: 1, height: HEADER_ROW_HEIGHT_PX }}
            >
              {format(parseISO(dateKey), "EEE d", { locale: es })}
            </div>
          );
        })}

        <AllDayRow
          mountedDays={mountedDays}
          gridColumnStart={mountedWindow.startIndex + 2}
          blocks={blocks}
          previewBlocks={previewBlocks}
          onSelectBlock={onSelectBlock}
          onToggleComplete={onToggleComplete}
          getContextMenuEntries={getContextMenuEntries}
        />

        <div
          data-gutter-cell
          className="relative z-10 border-r border-border bg-background text-right text-[0.7rem] text-muted-foreground"
          style={{ gridColumn: 1, gridRow: 3, width: GUTTER_WIDTH_PX, height: GRID_HEIGHT_PX }}
        >
          {HOURS.map((hour) => (
            <div key={hour} className="-translate-y-2 pr-2" style={{ height: HOUR_ROW_HEIGHT_PX }}>
              {formatHourLabel(hour, timeFormat)}
            </div>
          ))}
        </div>

        {mountedDays.map((dateKey, offset) => (
          <DayColumn
            key={`day-${dateKey}`}
            dateKey={dateKey}
            gridColumn={mountedWindow.startIndex + offset + 2}
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
