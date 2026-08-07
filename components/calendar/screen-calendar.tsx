"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Check, ExternalLink, Pencil, SkipForward, Trash2 } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { todayInTimeZone } from "@/lib/dates/today";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { useDeleteTask, useUpdateTask } from "@/lib/tasks/mutations";
import { useTaskDetail } from "@/components/tasks/task-detail-context";
import { isHabitDueOn } from "@/lib/habits/today";
import { useHabits } from "@/lib/habits/use-habits";
import { useMarkHabitDone, useUnmarkHabitDone, useUpdateHabit } from "@/lib/habits/mutations";
import { useSetHabitScheduleOverride } from "@/lib/habits/schedule-overrides";
import { useHabitScheduleOverridesForRange } from "@/lib/habits/use-habit-schedule-overrides-range";
import { useSkipHabit, useHabitSkipsForRange } from "@/lib/habits/skips";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { visibleDaysForFormat } from "@/lib/calendar/layout";
import { eventDragChanges, eventUpdateInput, taskDragPatch, habitDragOverride } from "@/lib/calendar/block-drag-translate";
import { durationMinutesBetween, isSameRange, type DragResult } from "@/lib/calendar/drag";
import type { CalendarBlock, UnscheduledHabitChip } from "@/lib/calendar/block";
import type { CalendarEventInstance, EventInput, RecurrenceEditScope } from "@/lib/calendar/events";
import {
  eventBlockId,
  eventToCalendarBlock,
  habitToCalendarBlock,
  parseHabitBlockId,
  taskRecurrencePreviewBlocks,
  taskToCalendarBlock,
} from "@/lib/calendar/screen-blocks";
import { useCalendarRangeEvents } from "@/lib/calendar/use-calendar-range-events";
import { useRecurringTaskFields } from "@/lib/calendar/use-recurring-task-fields";
import { useUpdateEvent } from "@/lib/calendar/use-update-event";
import { canWriteCalendar, useGoogleCalendars } from "@/lib/calendar/use-google-calendars";
import { useProjects } from "@/lib/projects/use-projects";
import { expandRecurringTaskRange } from "@/lib/recurrence/expand-range";
import { toastSuccess } from "@/lib/toast";
import type { CalendarDate } from "@/lib/parser/dates";
import type { ViewOptions } from "@/lib/view-options/schema";
import type { AppContextMenuEntry } from "@/components/primitives/context-menu";
import { CalendarNav } from "./calendar-nav";
import { CalendarView } from "./calendar-view";
import { CreateTaskFromRangeDialog } from "./create-task-from-range-dialog";
import { EditEventDialog } from "./edit-event-dialog";
import { RecurrenceScopeDialog } from "./recurrence-scope-dialog";
import { useEventDeleteFlow } from "./use-event-delete-flow";

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
  const deleteTask = useDeleteTask();
  const setHabitOverride = useSetHabitScheduleOverride();
  const updateHabit = useUpdateHabit();
  const markHabitDone = useMarkHabitDone();
  const unmarkHabitDone = useUnmarkHabitDone();
  const skipHabit = useSkipHabit();
  const updateEvent = useUpdateEvent();
  const eventDelete = useEventDeleteFlow();

  const [createRange, setCreateRange] = useState<DragResult | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEventInstance | null>(null);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [pendingEventUpdate, setPendingEventUpdate] = useState<{ event: CalendarEventInstance; changes: EventInput } | null>(null);

  const visibleDays = useMemo(
    () => (anchorDate ? visibleDaysForFormat(options.formato_calendario, anchorDate, weekStartsOn) : []),
    [options.formato_calendario, anchorDate, weekStartsOn],
  );

  const rangeEvents = useCalendarRangeEvents(visibleDays, timezone);
  const rangeOverrides = useHabitScheduleOverridesForRange(visibleDays);
  const rangeSkips = useHabitSkipsForRange(visibleDays);

  // Grupo 7 ("montar `CalendarView`", D-F): la lista de calendarios de
  // Google, para el nombre a mostrar (tarea 4/D-A) y para cruzar el permiso
  // de escritura antes de ofrecer "Eliminar" — mismo patrón que
  // `use-hoy-events.ts`. La lista de proyectos, para el nombre que le falta
  // al bloque de tarea (tarea 4).
  const calendars = useGoogleCalendars().data?.calendars;
  const calendarById = useMemo(() => new Map((calendars ?? []).map((calendar) => [calendar.id, calendar] as const)), [calendars]);
  const { data: projects } = useProjects();
  const projectNameById = useMemo(() => new Map((projects ?? []).map((project) => [project.id, project.name] as const)), [projects]);

  function canEditEvent(event: CalendarEventInstance): boolean {
    const calendar = calendarById.get(event.calendarId);
    return calendar ? canWriteCalendar(calendar) : false;
  }

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t] as const)), [tasks]);
  const habitsById = useMemo(() => new Map((habits ?? []).map((h) => [h.id, h] as const)), [habits]);
  // Indexado por `calendario + evento` (defecto encontrado al verificar el
  // grupo 7), no por `event.id` solo: Google no garantiza ese id único entre
  // calendarios distintos de la misma cuenta, y una colisión hacía que el
  // menú contextual/diálogo de un evento operara sobre otro.
  const eventsById = useMemo(() => {
    const events = rangeEvents.data?.status === "ok" ? rangeEvents.data.events : [];
    return new Map(events.map((event) => [eventBlockId(event.calendarId, event.id), event] as const));
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
        .map((task) => taskToCalendarBlock(task, resolveTaskColor(task), projectNameById.get(task.project_id)))
        .filter((block): block is CalendarBlock => block !== null),
    [tasks, resolveTaskColor, projectNameById],
  );

  const { habitBlocks, unscheduledHabits } = useMemo(() => {
    if (!options.showHabits || !habits) {
      return { habitBlocks: [] as CalendarBlock[], unscheduledHabits: [] as UnscheduledHabitChip[] };
    }
    const overridesByDate = rangeOverrides.data ?? {};
    const skipsByDate = rangeSkips.data ?? {};
    const timed: CalendarBlock[] = [];
    const chipHabitIds = new Set<string>();

    for (const day of visibleDays) {
      for (const habit of habits) {
        if (!isHabitDueOn(habit, day, timezone)) continue;
        const overrideTime = overridesByDate[day]?.[habit.id];
        const effectiveTime = overrideTime ?? habit.scheduled_time;
        if (effectiveTime) {
          const skipped = skipsByDate[day]?.[habit.id] ?? false;
          timed.push(habitToCalendarBlock(habit, day, effectiveTime, resolveProjectColorHex(habit.color, theme), timezone, skipped));
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
  }, [options.showHabits, habits, rangeOverrides.data, rangeSkips.data, visibleDays, timezone, theme, habitsById]);

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
      const calendarName = calendarById.get(event.calendarId)?.summary;
      if (pendingEventUpdate && pendingEventUpdate.event.calendarId === event.calendarId && pendingEventUpdate.event.id === event.id) {
        return eventToCalendarBlock({ ...event, ...pendingEventUpdate.changes }, calendarName);
      }
      return eventToCalendarBlock(event, calendarName);
    });
  }, [rangeEvents.data, pendingEventUpdate, calendarById]);

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
    // Hábito: mismo destino que "Editar" en el menú contextual, más abajo.
    setEditingHabitId(parseHabitBlockId(block.id));
  }

  /** Fecha calendario (`yyyy-MM-dd`) del día al que pertenece este bloque, en `timezone` — la misma que se usó para construirlo (`habitToCalendarBlock`/`taskToCalendarBlock`), sin depender del formato interno de `block.id`. */
  function blockDate(block: CalendarBlock): string {
    return formatInTimeZone(parseISO(block.start), timezone, "yyyy-MM-dd");
  }

  /**
   * Control de completar (grupo 2/7, D-A): el mismo manejador atiende el
   * casillero del bloque y el ítem "Completar" del menú contextual, para no
   * duplicar la traducción de tipo → mutación. Una tarea se completa
   * cualquier día; un hábito **solo el día de hoy**
   * (`lib/habits/mutations.ts`, `assertIsToday`) — intentarlo en otro día
   * rechaza con el aviso de tres partes ya escrito ahí, no hace falta
   * repetir la validación acá.
   */
  function handleToggleComplete(block: CalendarBlock) {
    if (block.type === "task") {
      const task = tasksById.get(block.id);
      if (!task) return;
      updateTask.mutate({ id: task.id, projectId: task.project_id, patch: { completed_at: block.completed ? null : new Date().toISOString() } });
      return;
    }
    if (block.type !== "habit") return;
    const habitId = parseHabitBlockId(block.id);
    const date = blockDate(block);
    if (block.completed) {
      unmarkHabitDone.mutate({ habitId, date, timezone });
    } else {
      markHabitDone.mutate({ habitId, date, timezone });
    }
  }

  /**
   * Menú contextual de un bloque (grupo 7, D-E): clic derecho en todo
   * bloque, con la primitiva compartida (`AppContextMenu`). `CalendarView`
   * sigue sin saber de dominios (D-F): esta función es la única que decide
   * qué ofrece cada tipo, a partir de los datos que esta pantalla ya tiene
   * a mano.
   */
  function buildContextMenuEntries(block: CalendarBlock): AppContextMenuEntry[] {
    if (block.isPreview) return [];

    if (block.type === "event") {
      const event = eventsById.get(block.id);
      if (!event) return [];
      const canEdit = canEditEvent(event);
      return [
        { label: "Editar", icon: <Pencil className="size-3.5" />, onSelect: () => setEditingEvent(event) },
        {
          label: "Abrir en Google Calendar",
          icon: <ExternalLink className="size-3.5" />,
          onSelect: () => {
            if (event.htmlLink) window.open(event.htmlLink, "_blank", "noopener,noreferrer");
          },
        },
        ...(canEdit
          ? ([
              { type: "separator" as const },
              { label: "Eliminar", icon: <Trash2 className="size-3.5" />, onSelect: () => eventDelete.requestDelete(event), destructive: true },
            ] satisfies AppContextMenuEntry[])
          : []),
      ];
    }

    if (block.type === "task") {
      const task = tasksById.get(block.id);
      if (!task) return [];
      return [
        { label: "Abrir detalle", onSelect: () => openTaskDetail(task.id) },
        { label: block.completed ? "Descompletar" : "Completar", icon: <Check className="size-3.5" />, onSelect: () => handleToggleComplete(block) },
        { type: "separator" },
        {
          label: "Eliminar",
          icon: <Trash2 className="size-3.5" />,
          onSelect: () => deleteTask.mutate({ id: task.id, projectId: task.project_id }),
          destructive: true,
        },
      ];
    }

    // Hábito.
    const habitId = parseHabitBlockId(block.id);
    const habit = habitsById.get(habitId);
    if (!habit) return [];
    // No se ofrece saltear sobre un bloque ya cumplido (tarea 7.5, D-F: la
    // mutación no lo impide a propósito, es política de interfaz) ni sobre
    // uno ya salteado (insertaría un salteo duplicado sin sentido).
    const canSkip = !block.completed && !block.skipped;
    return [
      { label: "Editar", icon: <Pencil className="size-3.5" />, onSelect: () => setEditingHabitId(habitId) },
      { label: block.completed ? "Descompletar" : "Completar", icon: <Check className="size-3.5" />, onSelect: () => handleToggleComplete(block) },
      ...(canSkip
        ? ([
            {
              label: "Saltear este día",
              icon: <SkipForward className="size-3.5" />,
              onSelect: () => skipHabit.mutate({ habitId, habit, date: blockDate(block), timezone }),
            },
          ] satisfies AppContextMenuEntry[])
        : []),
    ];
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

  // Guard compartido (reporte "soltar donde estaba dispara una mutación"):
  // sin esto, arrastrar y volver a soltar en la misma ranura de 15 minutos y
  // el mismo día igual mutaba, y si el bloque era un evento recurrente,
  // abría el diálogo de alcance sin que hubiera nada que editar. Cubre mover
  // y redimensionar por igual, cada uno en su propia función más abajo. No
  // aplica a un bloque de todo el día: arrastrarlo a la grilla siempre
  // cambia su forma (de fecha calendario a rango horario), así que nunca
  // coincide.

  /** Tarea y evento: el patch de destino sale solo del rango final, sin importar si el gesto fue mover o redimensionar (`taskDragPatch`/`eventDragChanges` no distinguen uno de otro) — por eso las dos funciones de abajo comparten esta cola. Hábito difiere entre las dos, se resuelve en cada una. */
  function applyRangeToTaskOrEvent(block: CalendarBlock, range: DragResult) {
    if (block.type === "task") {
      const task = tasksById.get(block.id);
      if (!task) return;
      updateTask.mutate({ id: task.id, projectId: task.project_id, patch: taskDragPatch(range) });
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

  /**
   * Mover un bloque (arrastrar el chip completo — `onMoveBlock` de
   * `CalendarView`, el gesto de `@dnd-kit`): para un hábito escribe un
   * override de ESE día (`habit_schedule_overrides`), sin tocar el horario
   * habitual. Sin cambios de comportamiento respecto de antes.
   */
  function handleMoveBlock(block: CalendarBlock, range: DragResult) {
    if (isSameRange(block.start, block.end, range)) return;
    if (block.type === "habit") {
      const habitId = parseHabitBlockId(block.id);
      const habit = habitsById.get(habitId);
      if (!habit) return;
      const { date, scheduledTime } = habitDragOverride(range.start, timezone);
      setHabitOverride.mutate({ habitId, habit, date, scheduledTime, timezone });
      return;
    }
    applyRangeToTaskOrEvent(block, range);
  }

  /**
   * Redimensionar (estirar la manija — `onResizeBlock` de `CalendarView`,
   * el seguimiento nativo de puntero de `draggable-timed-block.tsx`: un
   * gesto propio, con su propio callback, así que no hace falta adivinarlo
   * comparando rangos). Para un hábito escribe `habits.duration_minutes` —
   * GLOBAL, afecta TODAS las ocurrencias — revirtiendo la decisión archivada
   * en `calendario-legible-y-manipulable` que lo descartaba (D51,
   * `docs/decisions.md`): el motivo de entonces —que
   * `habit_schedule_overrides` no tiene columna de duración— sigue siendo
   * cierto, pero dejó de ser el lugar donde se guarda. Mismo criterio que ya
   * rige mover un hábito sin horario (`handleScheduleHabitChip`, más abajo):
   * el cambio es del hábito entero, no de un día puntual. El aviso al soltar
   * deja eso explícito, para que no se lea como "cambié la duración de hoy".
   */
  function handleResizeBlock(block: CalendarBlock, range: DragResult) {
    if (isSameRange(block.start, block.end, range)) return;
    if (block.type === "habit") {
      const habitId = parseHabitBlockId(block.id);
      const habit = habitsById.get(habitId);
      if (!habit) return;
      const durationMinutes = durationMinutesBetween(range.start.toISOString(), range.end.toISOString());
      updateHabit.mutate(
        { id: habitId, patch: { duration_minutes: durationMinutes } },
        {
          onSuccess: () =>
            toastSuccess(`Cambiaste la duración de "${habit.name}": se aplica a todas sus repeticiones, no solo a este día.`),
        },
      );
      return;
    }
    applyRangeToTaskOrEvent(block, range);
  }

  /**
   * Arrastrar el chip de un hábito sin horario a la grilla le fija el
   * horario al hábito (`habits.scheduled_time`), no crea un override de un
   * día: a diferencia de mover una ocurrencia ya programada
   * (`handleMoveBlock`), acá no hay horario habitual que preservar —
   * "sin horario" no es un horario, así que no hay nada que un override
   * pueda dejar intacto. Consecuencia: todas las ocurrencias pasan a verse
   * en la grilla a esa hora y el chip de arriba desaparece (deja de estar
   * en `unscheduledHabits`, `useMemo` de arriba).
   */
  function handleScheduleHabitChip(chip: UnscheduledHabitChip, target: { date: string; time: string }) {
    if (!habitsById.has(chip.id)) return;
    updateHabit.mutate({ id: chip.id, patch: { scheduled_time: target.time } });
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
          onToggleComplete={handleToggleComplete}
          onMoveBlock={handleMoveBlock}
          onResizeBlock={handleResizeBlock}
          getContextMenuEntries={buildContextMenuEntries}
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
          readOnly={!canEditEvent(editingEvent)}
          onRequestDelete={() => {
            setEditingEvent(null);
            eventDelete.requestDelete(editingEvent);
          }}
        />
      )}

      {editingHabitId && (
        <HabitFormDialog open onOpenChange={(open) => !open && setEditingHabitId(null)} habit={habitsById.get(editingHabitId)} />
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

      {eventDelete.dialogs}
    </div>
  );
}
