"use client";

import { useMemo, useState } from "react";
import { differenceInMinutes, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { AppContextMenuEntry } from "@/components/primitives/context-menu";
import { dayCountForFormat, visibleDaysForFormat } from "@/lib/calendar/layout";
import { todayInTimeZone } from "@/lib/dates/today";
import {
  clampMinutes,
  DAY_MINUTES,
  instantFromDayMinutes,
  localMinutesOfDay,
  minutesToTimeString,
  moveBlockToPosition,
  pixelsToMinutes,
  snapToQuarterHour,
  type DragResult,
} from "@/lib/calendar/drag";
import type { CalendarBlock, CalendarFormat, UnscheduledHabitChip } from "@/lib/calendar/block";
import { CalendarBlockChip } from "./calendar-block-chip";
import { CreateBlockChoiceDialog } from "./create-block-choice-dialog";
import { CreateEventDialog } from "./create-event-dialog";
import { HOUR_ROW_HEIGHT_PX } from "./grid-metrics";
import { MonthGrid } from "./month-grid";
import { TimeGrid } from "./time-grid";
import { UnscheduledHabitsRow } from "./unscheduled-habits-row";

type DragActiveData = { kind: "move-block"; block: CalendarBlock } | { kind: "schedule-chip"; chip: UnscheduledHabitChip };

/** `dragPreviewRange` con el día de destino sumado (reporte "falta la sombra del destino"): el rango ya ajustado a la grilla más la columna donde cayó, que puede ser distinta de la de origen. */
type DragPreviewRange = DragResult & { dateKey: string };

/** Duración de arranque para un bloque que no tenía horario (tarea 6.4): 30 minutos, una de las opciones rápidas del campo de duración estimada (`components/selectors/duration-input.ts`) — el usuario la ajusta después desde ahí si no le sirve. */
const DEFAULT_UNTIMED_DURATION_MINUTES = 30;

/**
 * Vista de calendario (grupo 5, D-E y D-F de `design.md`; arrastre sumado
 * en el grupo 6 sin rehacer la grilla): recibe bloques ya armados por cada
 * dominio (tarea, hábito, evento) en la forma común de `CalendarBlock` y
 * los dibuja en el formato pedido, más los chips sueltos de hábitos sin
 * horario (tarea 6.6).
 *
 * El `DndContext` vive acá, no en `time-grid.tsx`/`unscheduled-habits-row.tsx`
 * (tarea 6.1/6.6): mover un bloque y programar un chip son dos gestos que
 * empiezan en componentes distintos y terminan en el mismo destino (una
 * columna de día de la grilla horaria), así que necesitan un único
 * `onDragEnd` que sepa distinguirlos — cada `useDraggable` viaja con un
 * `data.current.kind` propio (`"move-block"` o `"schedule-chip"`), y es
 * eso lo que se lee acá, no el `id` de arrastre.
 *
 * D-F se sostiene igual que en el grupo 5: esta vista nunca decide qué
 * mutación corresponde. `onMoveBlock`/`onResizeBlock`/`onScheduleHabitChip`
 * entregan el resultado geométrico y quien monta la pantalla (grupo 7)
 * llama a `lib/calendar/block-drag-translate.ts` según `block.type`. La
 * única mutación que esta vista sí conoce es "crear un evento de Google"
 * (`onChooseEvent`/`CreateEventDialog`), porque ese es su propio dominio
 * —igual que ya conoce `recurrence-scope-dialog.tsx`—, a diferencia de
 * tareas y hábitos, que viven en `lib/tasks/`/`lib/habits/` y por eso se
 * delegan por `onCreateTask`.
 *
 * Los cuatro formatos existen siempre (D-E): esto no oculta ninguno según
 * el ancho, solo cambia cómo se dibuja el elegido.
 *
 * `now` es obligatorio, sin default propio: un `new Date()` evaluado acá
 * adentro tomaría un valor distinto en el render de servidor y en la
 * hidratación del cliente (la línea de la hora actual depende de un
 * instante continuo), así que quien monta la pantalla es quien resuelve
 * ese reloj una sola vez, después de montar — mismo principio que
 * `lib/dates/today.ts` ("ahora" viaja explícito, nunca implícito).
 */
export function CalendarView({
  format,
  anchorDate,
  timezone,
  weekStartsOn,
  blocks,
  previewBlocks = [],
  unscheduledHabits = [],
  now,
  timeFormat = 24,
  onSelectBlock,
  onToggleComplete,
  onMoveBlock,
  onResizeBlock,
  getContextMenuEntries,
  onScheduleHabitChip,
  onCreateTask,
  onVisibleRangeChange,
}: {
  format: CalendarFormat;
  /** Día ancla en `yyyy-MM-dd`: el día mostrado (formato "dia"), el primero de la ventana (formato "cuatro-dias"), o cualquier día dentro de la semana/mes mostrado. */
  anchorDate: string;
  timezone: string;
  weekStartsOn: 0 | 1 | 6;
  blocks: CalendarBlock[];
  /** Vista previa de repeticiones futuras (tarea 5.7): siempre no interactivos, sin importar lo que traigan. */
  previewBlocks?: CalendarBlock[];
  /** Hábitos sin horario fijo (tarea 6.6): chips sueltos, arrastrables a un horario puntual. Vacío por defecto para no romper a quien todavía no los pasa. */
  unscheduledHabits?: UnscheduledHabitChip[];
  now: Date;
  timeFormat?: 12 | 24;
  onSelectBlock?: (block: CalendarBlock) => void;
  /** Se tildó el control de completar de una tarea o un hábito (grupo 7, D-F): traducirlo a la mutación del dominio es responsabilidad de quien la reciba, igual que `onMoveBlock`. */
  onToggleComplete?: (block: CalendarBlock) => void;
  /** Un bloque se movió (arrastrado o redimensionado con el mismo evento) a un nuevo rango (tarea 6.1/6.3, D-F): traducirlo a la mutación del dominio es responsabilidad de quien la reciba. */
  onMoveBlock?: (block: CalendarBlock, range: DragResult) => void;
  /** Se estiró el borde de un bloque (tarea 6.2/6.3, D-F). */
  onResizeBlock?: (block: CalendarBlock, range: DragResult) => void;
  /** Clic derecho en un bloque (grupo 7, D-E): esta vista sigue sin saber qué ofrece cada tipo (D-F), quien monta la pantalla resuelve las entradas según `block.type`. */
  getContextMenuEntries?: (block: CalendarBlock) => AppContextMenuEntry[];
  /** Se arrastró un chip de hábito sin horario a un día y una hora puntuales (tarea 6.3/6.6): `time` viene en `HH:mm:ss`, el formato de `habit_schedule_overrides.scheduled_time`. */
  onScheduleHabitChip?: (chip: UnscheduledHabitChip, target: { date: string; time: string }) => void;
  /** Se pidió crear una tarea en un rango (tarea 6.7): sin este callback, elegir "Tarea" en el diálogo no hace nada — la creación de tareas necesita un proyecto destino que esta vista no conoce. */
  onCreateTask?: (range: DragResult) => void;
  /** El usuario corrió el desplazamiento continuo (tarea 6.1/6.2, formatos día/cuatro días/semana): nuevo primer día visible, para que `anchorDate` lo siga. */
  onVisibleRangeChange?: (startDate: string) => void;
}) {
  const today = todayInTimeZone(now, timezone);
  const visibleDays = useMemo(
    () => visibleDaysForFormat(format, anchorDate, weekStartsOn, today),
    [format, anchorDate, weekStartsOn, today],
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  // Dos estados separados a propósito: `choiceRange` maneja la pregunta
  // "¿tarea o evento?" y `eventRange` sigue vivo mientras se completa el
  // alta de evento, aunque la pregunta ya se haya cerrado.
  const [choiceRange, setChoiceRange] = useState<DragResult | null>(null);
  const [eventRange, setEventRange] = useState<DragResult | null>(null);

  // Arrastre de un bloque ya programado (grupo 4, D-C): `activeBlock`
  // alimenta la copia del `DragOverlay` (más abajo), `dragOrigin` la sombra
  // del hueco de donde salió (`time-grid.tsx`) y `dragPreviewRange` la hora
  // y el día de destino ya ajustados a la grilla — las tres se resetean
  // juntas al terminar o cancelar el gesto (`resetDragState`).
  const [activeBlock, setActiveBlock] = useState<CalendarBlock | null>(null);
  const [dragOrigin, setDragOrigin] = useState<{ dateKey: string; startMinutes: number; endMinutes: number } | null>(null);
  const [dragPreviewRange, setDragPreviewRange] = useState<DragPreviewRange | null>(null);

  function resetDragState() {
    setActiveBlock(null);
    setDragOrigin(null);
    setDragPreviewRange(null);
  }

  function handleCreateRange(dateKey: string, startMinutes: number, endMinutes: number) {
    setChoiceRange({ start: instantFromDayMinutes(dateKey, startMinutes, timezone), end: instantFromDayMinutes(dateKey, endMinutes, timezone) });
  }

  function handleDragStart(event: DragStartEvent) {
    const activeData = event.active.data.current as DragActiveData | undefined;
    if (activeData?.kind !== "move-block") return;
    const { block } = activeData;
    // Un bloque de todo el día (`all-day-row.tsx`) sigue con su propio
    // seguimiento de puntero, sin overlay ni sombra: vive fuera de esta
    // grilla horaria (su `start`/`end` son fechas calendario, no un
    // horario) y ese componente todavía no oculta su nodo original — sumar
    // acá una copia flotante duplicaría el bloque que se ve mientras se
    // arrastra. Fuera de alcance de esta tanda (`draggable-timed-block.tsx`
    // y `time-grid.tsx` son los que pedía D-C).
    if (block.allDay) return;
    setActiveBlock(block);
    const startDate = parseISO(block.start);
    const endDate = parseISO(block.end);
    setDragOrigin({
      dateKey: formatInTimeZone(startDate, timezone, "yyyy-MM-dd"),
      startMinutes: localMinutesOfDay(startDate, timezone),
      endMinutes: localMinutesOfDay(endDate, timezone),
    });
  }

  function handleDragMove(event: DragMoveEvent) {
    const { active, over } = event;
    const activeData = active.data.current as DragActiveData | undefined;
    if (!activeData || !over) {
      setDragPreviewRange(null);
      return;
    }
    const overData = over.data.current as { dateKey: string } | undefined;
    const translatedTop = active.rect.current.translated?.top ?? active.rect.current.initial?.top;
    if (!overData || translatedTop == null) {
      setDragPreviewRange(null);
      return;
    }
    const rawStartMinutes = pixelsToMinutes(translatedTop - over.rect.top, HOUR_ROW_HEIGHT_PX);
    // Un chip de hábito sin horario (`schedule-chip`) no tiene una duración
    // propia que conservar (`habit_schedule_overrides` no la guarda, mismo
    // motivo que `DEFAULT_UNTIMED_DURATION_MINUTES` en `handleDragEnd` de
    // `screen-calendar.tsx`) — la sombra de destino usa la misma duración de
    // arranque solo para dibujarse, no cambia qué se guarda al soltar.
    const durationMinutes =
      activeData.kind === "move-block"
        ? activeData.block.allDay
          ? DEFAULT_UNTIMED_DURATION_MINUTES
          : differenceInMinutes(parseISO(activeData.block.end), parseISO(activeData.block.start))
        : DEFAULT_UNTIMED_DURATION_MINUTES;
    const range = moveBlockToPosition(rawStartMinutes, durationMinutes, overData.dateKey, timezone);
    setDragPreviewRange({ ...range, dateKey: overData.dateKey });
  }

  function handleDragEnd(event: DragEndEvent) {
    resetDragState();
    const { active, over } = event;
    if (!over) return;
    const overData = over.data.current as { dateKey: string } | undefined;
    if (!overData) return;

    const translatedTop = active.rect.current.translated?.top ?? active.rect.current.initial?.top;
    if (translatedTop == null) return;
    const rawStartMinutes = pixelsToMinutes(translatedTop - over.rect.top, HOUR_ROW_HEIGHT_PX);

    const activeData = active.data.current as DragActiveData | undefined;
    if (!activeData) return;

    if (activeData.kind === "move-block") {
      const { block } = activeData;
      // Un bloque de todo el día (tarea 6.4, requirement "una tarea de todo
      // el día pasa a tener hora") no tiene una duración previa que
      // conservar — su `start`/`end` son dos fechas calendario, no un
      // rango horario — así que arrastrarlo a la grilla le da una
      // duración de arranque razonable en vez de las 24 horas que saldría
      // de restar sus dos fechas.
      const durationMinutes = block.allDay ? DEFAULT_UNTIMED_DURATION_MINUTES : differenceInMinutes(parseISO(block.end), parseISO(block.start));
      const range = moveBlockToPosition(rawStartMinutes, durationMinutes, overData.dateKey, timezone);
      onMoveBlock?.(block, range);
      return;
    }

    const { chip } = activeData;
    const snapped = clampMinutes(snapToQuarterHour(rawStartMinutes), 0, DAY_MINUTES);
    onScheduleHabitChip?.(chip, { date: overData.dateKey, time: minutesToTimeString(snapped) });
  }

  // Sombra de destino (reporte "falta la sombra del destino mientras se
  // arrastra"): mismo `{ dateKey, startMinutes, endMinutes }` que ya usa
  // `dragOrigin`, derivado acá de `dragPreviewRange` (que guarda instantes,
  // no minutos locales) para que `TimeGrid`/`DayColumn` reciban las dos
  // sombras con la misma forma.
  const dragDestination = dragPreviewRange
    ? {
        dateKey: dragPreviewRange.dateKey,
        startMinutes: localMinutesOfDay(dragPreviewRange.start, timezone),
        endMinutes: localMinutesOfDay(dragPreviewRange.end, timezone),
      }
    : null;

  const content =
    format === "mes" ? (
      <MonthGrid
        visibleDays={visibleDays}
        anchorDate={anchorDate}
        blocks={blocks}
        previewBlocks={previewBlocks}
        timezone={timezone}
        weekStartsOn={weekStartsOn}
        now={now}
        onSelectBlock={onSelectBlock}
      />
    ) : (
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border">
        <UnscheduledHabitsRow chips={unscheduledHabits} />
        <TimeGrid
          startDate={visibleDays[0] ?? anchorDate}
          dayCount={dayCountForFormat(format)}
          blocks={blocks}
          previewBlocks={previewBlocks}
          timezone={timezone}
          now={now}
          timeFormat={timeFormat}
          dragOrigin={dragOrigin}
          dragDestination={dragDestination}
          onSelectBlock={onSelectBlock}
          onToggleComplete={onToggleComplete}
          onResizeBlock={onResizeBlock}
          getContextMenuEntries={getContextMenuEntries}
          onCreateRange={handleCreateRange}
          onVisibleRangeChange={onVisibleRangeChange}
        />
      </div>
    );

  // Copia flotante del bloque en movimiento (tarea 4.1/4.2, D-C): mientras
  // se conoce `dragPreviewRange` (la hora de destino ya ajustada a la
  // grilla, calculada en `handleDragMove`), se le pisan `start`/`end` a
  // `activeBlock` para que `CalendarBlockChip` muestre esa hora, no la
  // original — es literalmente la que se va a guardar al soltar.
  const dragOverlayBlock =
    activeBlock && dragPreviewRange
      ? { ...activeBlock, start: dragPreviewRange.start.toISOString(), end: dragPreviewRange.end.toISOString() }
      : activeBlock;

  return (
    // `id` fijo (no el default autoincremental de `@dnd-kit`): sin esto, los
    // `aria-describedby`/`id` que arma internamente para las instrucciones
    // de accesibilidad dependen de cuántos `DndContext` ya se montaron en
    // ese proceso, y el conteo del server (un proceso Node de larga vida)
    // diverge del conteo del cliente (uno por carga de página) — hydration
    // mismatch detectado a mano al probar esta tanda, mismo riesgo latente
    // que ya tiene `components/board/board.tsx` sin `id` propio.
    <DndContext
      id="calendar-drag"
      sensors={sensors}
      // Los droppables (columnas de día) se vuelven a medir en cada frame
      // mientras dura el arrastre (tarea 7.1, `design.md` decisión 6): sin
      // esto, dnd-kit solo mide una vez al arrancar el gesto, así que el
      // autodesplazamiento contra el borde (activado por defecto,
      // `autoScroll`) movería `scrollLeft` pero la sombra de destino
      // seguiría apuntando a la posición vieja de las columnas.
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={resetDragState}
    >
      {content}

      {choiceRange && (
        <CreateBlockChoiceDialog
          open
          onOpenChange={(open) => !open && setChoiceRange(null)}
          rangeLabel={formatRangeLabel(choiceRange, timezone)}
          onChooseTask={() => {
            onCreateTask?.(choiceRange);
            setChoiceRange(null);
          }}
          onChooseEvent={() => {
            setEventRange(choiceRange);
            setChoiceRange(null);
          }}
        />
      )}

      {eventRange && (
        <CreateEventDialog
          open
          onOpenChange={(open) => !open && setEventRange(null)}
          start={eventRange.start}
          end={eventRange.end}
          timezone={timezone}
        />
      )}

      {/*
       * Portal fuera de los tres contenedores con desplazamiento anidados
       * (tarea 4.1, D-C): mismo patrón que `components/board/board.tsx`
       * (`dropAnimation={null}` porque `onMoveBlock` ya deja el bloque
       * optimista en su nueva posición antes de que termine cualquier
       * animación de vuelta). Solo se llena para un bloque con horario —
       * `draggable-timed-block.tsx` oculta su nodo original mientras
       * `isDragging`, así que esta copia es lo único que sigue al puntero.
       * Un bloque de todo el día (`all-day-row.tsx`) no pasa por acá (ver
       * el comentario de `handleDragStart`) y sigue con su propio
       * seguimiento, sin tocar en esta tanda.
       */}
      <DragOverlay dropAnimation={null} className="pointer-events-none">
        {dragOverlayBlock && <CalendarBlockChip block={dragOverlayBlock} variant="overlay" />}
      </DragOverlay>
    </DndContext>
  );
}

function formatRangeLabel(range: DragResult, timezone: string): string {
  const day = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(range.start);
  const startTime = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(range.start);
  const endTime = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(range.end);
  return `${day}, ${startTime}–${endTime}`;
}
