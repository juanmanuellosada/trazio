"use client";

import { useMemo, useState } from "react";
import { differenceInMinutes, parseISO } from "date-fns";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { visibleDaysForFormat } from "@/lib/calendar/layout";
import { clampMinutes, DAY_MINUTES, instantFromDayMinutes, minutesToTimeString, moveBlockToPosition, pixelsToMinutes, snapToQuarterHour, type DragResult } from "@/lib/calendar/drag";
import type { CalendarBlock, CalendarFormat, UnscheduledHabitChip } from "@/lib/calendar/block";
import { AllDayRow } from "./all-day-row";
import { CreateBlockChoiceDialog } from "./create-block-choice-dialog";
import { CreateEventDialog } from "./create-event-dialog";
import { HOUR_ROW_HEIGHT_PX } from "./grid-metrics";
import { MonthGrid } from "./month-grid";
import { TimeGrid } from "./time-grid";
import { UnscheduledHabitsRow } from "./unscheduled-habits-row";

type DragActiveData = { kind: "move-block"; block: CalendarBlock } | { kind: "schedule-chip"; chip: UnscheduledHabitChip };

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
  onMoveBlock,
  onResizeBlock,
  onScheduleHabitChip,
  onCreateTask,
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
  /** Un bloque se movió (arrastrado o redimensionado con el mismo evento) a un nuevo rango (tarea 6.1/6.3, D-F): traducirlo a la mutación del dominio es responsabilidad de quien la reciba. */
  onMoveBlock?: (block: CalendarBlock, range: DragResult) => void;
  /** Se estiró el borde de un bloque (tarea 6.2/6.3, D-F). */
  onResizeBlock?: (block: CalendarBlock, range: DragResult) => void;
  /** Se arrastró un chip de hábito sin horario a un día y una hora puntuales (tarea 6.3/6.6): `time` viene en `HH:mm:ss`, el formato de `habit_schedule_overrides.scheduled_time`. */
  onScheduleHabitChip?: (chip: UnscheduledHabitChip, target: { date: string; time: string }) => void;
  /** Se pidió crear una tarea en un rango (tarea 6.7): sin este callback, elegir "Tarea" en el diálogo no hace nada — la creación de tareas necesita un proyecto destino que esta vista no conoce. */
  onCreateTask?: (range: DragResult) => void;
}) {
  const visibleDays = useMemo(() => visibleDaysForFormat(format, anchorDate, weekStartsOn), [format, anchorDate, weekStartsOn]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  // Dos estados separados a propósito: `choiceRange` maneja la pregunta
  // "¿tarea o evento?" y `eventRange` sigue vivo mientras se completa el
  // alta de evento, aunque la pregunta ya se haya cerrado.
  const [choiceRange, setChoiceRange] = useState<DragResult | null>(null);
  const [eventRange, setEventRange] = useState<DragResult | null>(null);

  function handleCreateRange(dateKey: string, startMinutes: number, endMinutes: number) {
    setChoiceRange({ start: instantFromDayMinutes(dateKey, startMinutes, timezone), end: instantFromDayMinutes(dateKey, endMinutes, timezone) });
  }

  function handleDragEnd(event: DragEndEvent) {
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
        <AllDayRow visibleDays={visibleDays} blocks={blocks} previewBlocks={previewBlocks} onSelectBlock={onSelectBlock} />
        <TimeGrid
          visibleDays={visibleDays}
          blocks={blocks}
          previewBlocks={previewBlocks}
          timezone={timezone}
          now={now}
          timeFormat={timeFormat}
          onSelectBlock={onSelectBlock}
          onResizeBlock={onResizeBlock}
          onCreateRange={handleCreateRange}
        />
      </div>
    );

  return (
    // `id` fijo (no el default autoincremental de `@dnd-kit`): sin esto, los
    // `aria-describedby`/`id` que arma internamente para las instrucciones
    // de accesibilidad dependen de cuántos `DndContext` ya se montaron en
    // ese proceso, y el conteo del server (un proceso Node de larga vida)
    // diverge del conteo del cliente (uno por carga de página) — hydration
    // mismatch detectado a mano al probar esta tanda, mismo riesgo latente
    // que ya tiene `components/board/board.tsx` sin `id` propio.
    <DndContext id="calendar-drag" sensors={sensors} onDragEnd={handleDragEnd}>
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
    </DndContext>
  );
}

function formatRangeLabel(range: DragResult, timezone: string): string {
  const day = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(range.start);
  const startTime = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(range.start);
  const endTime = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(range.end);
  return `${day}, ${startTime}–${endTime}`;
}
