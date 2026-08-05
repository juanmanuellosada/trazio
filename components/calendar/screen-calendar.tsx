"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { todayInTimeZone } from "@/lib/dates/today";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { useUpdateTask } from "@/lib/tasks/mutations";
import { useTaskDetail } from "@/components/tasks/task-detail-context";
import { isHabitDueOn } from "@/lib/habits/today";
import { useHabits } from "@/lib/habits/use-habits";
import { useSetHabitScheduleOverride } from "@/lib/habits/schedule-overrides";
import { useHabitScheduleOverridesForRange } from "@/lib/habits/use-habit-schedule-overrides-range";
import { visibleDaysForFormat } from "@/lib/calendar/layout";
import { eventDragChanges, eventUpdateInput, taskDragPatch, habitDragOverride } from "@/lib/calendar/block-drag-translate";
import type { DragResult } from "@/lib/calendar/drag";
import type { CalendarBlock, UnscheduledHabitChip } from "@/lib/calendar/block";
import type { CalendarEventInstance, EventInput, RecurrenceEditScope } from "@/lib/calendar/events";
import {
  eventToCalendarBlock,
  habitToCalendarBlock,
  parseHabitBlockId,
  taskRecurrencePreviewBlocks,
  taskToCalendarBlock,
} from "@/lib/calendar/screen-blocks";
import { useCalendarRangeEvents } from "@/lib/calendar/use-calendar-range-events";
import { useRecurringTaskFields } from "@/lib/calendar/use-recurring-task-fields";
import { useUpdateEvent } from "@/lib/calendar/use-update-event";
import { expandRecurringTaskRange } from "@/lib/recurrence/expand-range";
import type { CalendarDate } from "@/lib/parser/dates";
import type { ViewOptions } from "@/lib/view-options/schema";
import { CalendarNav } from "./calendar-nav";
import { CalendarView } from "./calendar-view";
import { CreateTaskFromRangeDialog } from "./create-task-from-range-dialog";
import { EditEventDialog } from "./edit-event-dialog";
import { RecurrenceScopeDialog } from "./recurrence-scope-dialog";

function calendarDateFromKey(dateKey: string): CalendarDate {
  const [y, m, d] = dateKey.split("-").map(Number);
  return { y, m, d };
}

/**
 * Monta `CalendarView` en una pantalla con opciones de vista (grupo 7,
 * "montar `CalendarView`" — el hueco que dejó fuera la tarea 7.1 original):
 * arma los bloques de tareas, hábitos y eventos a partir de lo que cada
 * pantalla ya tiene (D-F, `CalendarView` sigue sin conocer ningún dominio),
 * resuelve el arrastre traduciendo cada tipo a su propia mutación
 * (`block-drag-translate.ts`, grupo 6), y navega entre días/semanas/meses
 * (`anchorDate` es estado local, no se persiste: solo el formato lo hace,
 * vía `view_preferences`).
 *
 * `now` se resuelve una sola vez, después de montar (comentario de
 * `calendar-view.tsx`): reusa `useMounted()` (mismo mecanismo que ya evita
 * el problema de tema con `LabelChipView`/`HabitCard`) en vez de un
 * `useEffect` que llame a `setState` — antes de montar, el snapshot de
 * servidor es "no montado" y `now` es `null`, así que el primer render del
 * cliente (hidratación) coincide con el del servidor; recién cuando React
 * detecta el cambio de snapshot, ya en el cliente, se resuelve el reloj una
 * única vez (el `useMemo` no vuelve a evaluar `new Date()` mientras
 * `mounted` no cambie).
 *
 * Los eventos pueden no cargar (D-C/tarea 3.7): igual se muestran tareas y
 * hábitos, con un aviso aparte en vez de romper la vista.
 *
 * Mover/redimensionar un evento (D24, tarea 8.4) usa `useUpdateEvent` +
 * `eventDragChanges`/`eventUpdateInput`; si el evento pertenece a una serie,
 * abre `RecurrenceScopeDialog` antes de mutar nada (sin default silencioso,
 * tarea 3.6). Un evento de todo el día se ignora al arrastrar (mismo
 * criterio que ya documenta `eventDragChanges`: no tiene horario que mover
 * en esta grilla). El camino sin arrastre (D24) es `EditEventDialog`, que
 * `handleSelectBlock` abre al hacer clic en un bloque de evento.
 *
 * Bloques de vista previa de repeticiones futuras de tareas (tarea 5.7,
 * `options.showFutureRecurrences`): `useRecurringTaskFields` trae los tres
 * campos de recurrencia que `TaskRow`/`TASK_LIST_COLUMNS` no incluyen (ver
 * `lib/calendar/use-recurring-task-fields.ts`), y
 * `lib/recurrence/expand-range.ts` calcula las fechas futuras dentro del
 * rango visible — nunca interactivos, la grilla ya los fuerza (`isPreview`).
 *
 * `hideNav` (`hoy-con-eventos`, D-F): Hoy monta este componente sin
 * `CalendarNav` — en una vista que es hoy por definición, un control para
 * ir a otro día se contradice con la vista que lo contiene. Sin
 * `CalendarNav` no hay forma de llamar a `setAnchorDateOverride`, así que
 * `anchorDate` queda derivado de `now` para siempre: "sin navegación" es
 * una consecuencia de no montar el control, no una rama de código aparte
 * que haya que mantener sincronizada.
 */
export function ScreenCalendar({
  timezone,
  weekStartsOn,
  timeFormat,
  options,
  tasks,
  resolveTaskColor,
  createTaskProjectId,
  hideNav = false,
}: {
  timezone: string;
  weekStartsOn: 0 | 1 | 6;
  timeFormat: 12 | 24;
  options: ViewOptions;
  /** Candidatas: cualquiera sin `due_date` ni `due_at` simplemente no se traduce a bloque (`taskToCalendarBlock`). */
  tasks: TaskRow[];
  resolveTaskColor: (task: TaskRow) => string;
  createTaskProjectId: string | null;
  /** Sin navegación entre días (D-F de `hoy-con-eventos`): la usa Hoy, siempre en modo día. */
  hideNav?: boolean;
}) {
  const mounted = useMounted();
  const now = useMemo(() => (mounted ? new Date() : null), [mounted]);

  // El día mostrado: `null` hasta que se navega a mano (flechas o "Hoy"), y
  // mientras tanto se deriva de `now` en cada render en vez de guardarse en
  // estado — nada de sincronizar un default por efecto (mismo motivo que
  // `now` de arriba).
  const [anchorDateOverride, setAnchorDateOverride] = useState<string | null>(null);
  const anchorDate = anchorDateOverride ?? (now ? todayInTimeZone(now, timezone) : null);

  const { resolvedTheme } = useTheme();
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";

  const { data: habits } = useHabits(timezone);
  const { open: openTaskDetail } = useTaskDetail();
  const updateTask = useUpdateTask();
  const setHabitOverride = useSetHabitScheduleOverride();
  const updateEvent = useUpdateEvent();

  const [createRange, setCreateRange] = useState<DragResult | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventInstance | null>(null);
  const [pendingEventUpdate, setPendingEventUpdate] = useState<{ event: CalendarEventInstance; changes: EventInput } | null>(null);

  const visibleDays = useMemo(
    () => (anchorDate ? visibleDaysForFormat(options.formato_calendario, anchorDate, weekStartsOn) : []),
    [options.formato_calendario, anchorDate, weekStartsOn],
  );

  const rangeEvents = useCalendarRangeEvents(visibleDays, timezone);
  const rangeOverrides = useHabitScheduleOverridesForRange(visibleDays);

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t] as const)), [tasks]);
  const habitsById = useMemo(() => new Map((habits ?? []).map((h) => [h.id, h] as const)), [habits]);
  const eventsById = useMemo(() => {
    const events = rangeEvents.data?.status === "ok" ? rangeEvents.data.events : [];
    return new Map(events.map((event) => [event.id, event] as const));
  }, [rangeEvents.data]);

  // Tarea 5.7: campos de recurrencia que `TaskRow` no trae (fuera de
  // alcance ampliar `TASK_LIST_COLUMNS`, la usan otras cinco pantallas),
  // pedidos aparte solo para las tareas ya visibles.
  const taskIds = useMemo(() => tasks.map((task) => task.id), [tasks]);
  const recurringTaskFields = useRecurringTaskFields(taskIds);

  const previewBlocks = useMemo(() => {
    if (!options.showFutureRecurrences || !recurringTaskFields.data || visibleDays.length === 0) return [];
    const rangeStart = calendarDateFromKey(visibleDays[0]!);
    const rangeEnd = calendarDateFromKey(visibleDays[visibleDays.length - 1]!);
    const fieldsByTaskId = new Map(recurringTaskFields.data.map((fields) => [fields.id, fields] as const));

    return tasks.flatMap((task) => {
      const fields = fieldsByTaskId.get(task.id);
      if (!fields) return [];
      const occurrences = expandRecurringTaskRange(
        {
          recurrence_rule: fields.recurrence_rule,
          due_date: task.due_date,
          due_at: task.due_at,
          recurrence_ends_at: fields.recurrence_ends_at,
          recurrence_count: fields.recurrence_count,
        },
        rangeStart,
        rangeEnd,
      );
      if (occurrences.length === 0) return [];
      return taskRecurrencePreviewBlocks(task, occurrences, resolveTaskColor(task), timezone);
    });
  }, [options.showFutureRecurrences, recurringTaskFields.data, visibleDays, tasks, resolveTaskColor, timezone]);

  const taskBlocks = useMemo(
    () =>
      tasks
        .map((task) => taskToCalendarBlock(task, resolveTaskColor(task)))
        .filter((block): block is CalendarBlock => block !== null),
    [tasks, resolveTaskColor],
  );

  const { habitBlocks, unscheduledHabits } = useMemo(() => {
    if (!options.showHabits || !habits) {
      return { habitBlocks: [] as CalendarBlock[], unscheduledHabits: [] as UnscheduledHabitChip[] };
    }
    const overridesByDate = rangeOverrides.data ?? {};
    const timed: CalendarBlock[] = [];
    const chipHabitIds = new Set<string>();

    for (const day of visibleDays) {
      for (const habit of habits) {
        if (!isHabitDueOn(habit, day, timezone)) continue;
        const overrideTime = overridesByDate[day]?.[habit.id];
        const effectiveTime = overrideTime ?? habit.scheduled_time;
        if (effectiveTime) {
          timed.push(habitToCalendarBlock(habit, day, effectiveTime, resolveProjectColorHex(habit.color, theme), timezone));
        } else {
          chipHabitIds.add(habit.id);
        }
      }
    }

    const chips = [...chipHabitIds].map((id) => {
      const habit = habitsById.get(id)!;
      return { id: habit.id, title: habit.name, color: resolveProjectColorHex(habit.color, theme) };
    });
    return { habitBlocks: timed, unscheduledHabits: chips };
  }, [options.showHabits, habits, rangeOverrides.data, visibleDays, timezone, theme, habitsById]);

  // `pendingEventUpdate` (tarea 5.4, D-D): mientras se pregunta el alcance
  // de una serie, el evento real en caché todavía no cambió (`applyEventUpdate`
  // recién se llama si se confirma), así que sin este parche el bloque
  // saltaba de vuelta al origen apenas se abría el diálogo — la grilla
  // seguía dibujando la posición vieja. Se pisa acá, en el único evento que
  // está pendiente, con el mismo rango que ya se va a guardar si confirma;
  // al cancelar (`setPendingEventUpdate(null)`), este `useMemo` vuelve a
  // devolver la posición real sin que nadie tenga que "revertir" nada.
  const eventBlocks = useMemo(() => {
    if (rangeEvents.data?.status !== "ok") return [];
    return rangeEvents.data.events.map((event) => {
      if (pendingEventUpdate?.event.id === event.id) {
        return eventToCalendarBlock({ ...event, ...pendingEventUpdate.changes });
      }
      return eventToCalendarBlock(event);
    });
  }, [rangeEvents.data, pendingEventUpdate]);

  const blocks = useMemo(() => [...taskBlocks, ...habitBlocks, ...eventBlocks], [taskBlocks, habitBlocks, eventBlocks]);

  function handleSelectBlock(block: CalendarBlock) {
    if (block.type === "task") {
      openTaskDetail(block.id);
      return;
    }
    if (block.type === "event") {
      const event = eventsById.get(block.id);
      if (event) setEditingEvent(event);
      return;
    }
    // Hábito: sin un detalle propio que abrir todavía desde acá.
  }

  function applyEventUpdate(event: CalendarEventInstance, changes: EventInput, scope?: RecurrenceEditScope) {
    updateEvent.mutate({
      target: {
        calendarId: event.calendarId,
        eventId: event.id,
        recurringEventId: event.recurringEventId,
        originalStartTime: event.originalStartTime,
      },
      changes,
      scope,
    });
  }

  function handleMoveOrResize(block: CalendarBlock, range: DragResult) {
    if (block.type === "task") {
      const task = tasksById.get(block.id);
      if (!task) return;
      updateTask.mutate({ id: task.id, projectId: task.project_id, patch: taskDragPatch(range) });
      return;
    }
    if (block.type === "habit") {
      const habitId = parseHabitBlockId(block.id);
      const habit = habitsById.get(habitId);
      if (!habit) return;
      const { date, scheduledTime } = habitDragOverride(range.start, timezone);
      setHabitOverride.mutate({ habitId, habit, date, scheduledTime, timezone });
      return;
    }

    const event = eventsById.get(block.id);
    // Todo el día: sin horario que mover en esta grilla horaria, se ignora
    // el arrastre (mismo criterio que ya documenta `eventDragChanges`).
    if (!event || event.allDay) return;
    const changes = eventUpdateInput(eventDragChanges(event, range), timezone);
    if (event.recurringEventId !== null) {
      setPendingEventUpdate({ event, changes });
      return;
    }
    applyEventUpdate(event, changes);
  }

  function handleScheduleHabitChip(chip: UnscheduledHabitChip, target: { date: string; time: string }) {
    const habit = habitsById.get(chip.id);
    if (!habit) return;
    setHabitOverride.mutate({ habitId: chip.id, habit, date: target.date, scheduledTime: target.time, timezone });
  }

  if (!now || !anchorDate) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {!hideNav && (
        <CalendarNav
          format={options.formato_calendario}
          anchorDate={anchorDate}
          visibleDays={visibleDays}
          timezone={timezone}
          now={now}
          onNavigate={setAnchorDateOverride}
        />
      )}

      {rangeEvents.data?.status === "unavailable" && (
        <p className="mb-2 text-sm text-text-secondary">
          {rangeEvents.data.reason === "needs_reauth"
            ? "No pudimos cargar tus eventos porque la conexión con Google necesita reconectarse."
            : "No pudimos cargar tus eventos porque Google no respondió. Volvé a intentar en un momento."}
        </p>
      )}

      <div className="min-h-0 flex-1">
        <CalendarView
          format={options.formato_calendario}
          anchorDate={anchorDate}
          timezone={timezone}
          weekStartsOn={weekStartsOn}
          blocks={blocks}
          previewBlocks={previewBlocks}
          unscheduledHabits={unscheduledHabits}
          now={now}
          timeFormat={timeFormat}
          onSelectBlock={handleSelectBlock}
          onMoveBlock={handleMoveOrResize}
          onResizeBlock={handleMoveOrResize}
          onScheduleHabitChip={handleScheduleHabitChip}
          onCreateTask={setCreateRange}
        />
      </div>

      {createRange && (
        <CreateTaskFromRangeDialog
          open
          onOpenChange={(open) => !open && setCreateRange(null)}
          range={createRange}
          fixedProjectId={createTaskProjectId}
        />
      )}

      {editingEvent && (
        <EditEventDialog
          open
          onOpenChange={(open) => !open && setEditingEvent(null)}
          event={editingEvent}
          timezone={timezone}
        />
      )}

      {pendingEventUpdate && (
        <RecurrenceScopeDialog
          open
          onOpenChange={(open) => !open && setPendingEventUpdate(null)}
          action="editar"
          onConfirm={(scope) => {
            applyEventUpdate(pendingEventUpdate.event, pendingEventUpdate.changes, scope);
            setPendingEventUpdate(null);
          }}
        />
      )}
    </div>
  );
}
