"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { useMounted } from "@/hooks/use-mounted";
import { todayInTimeZone } from "@/lib/dates/today";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { toastError } from "@/lib/toast";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { useUpdateTask } from "@/lib/tasks/mutations";
import { useTaskDetail } from "@/components/tasks/task-detail-context";
import { isHabitDueOn } from "@/lib/habits/today";
import { useHabits } from "@/lib/habits/use-habits";
import { useSetHabitScheduleOverride } from "@/lib/habits/schedule-overrides";
import { useHabitScheduleOverridesForRange } from "@/lib/habits/use-habit-schedule-overrides-range";
import { visibleDaysForFormat } from "@/lib/calendar/layout";
import { taskDragPatch, habitDragOverride } from "@/lib/calendar/block-drag-translate";
import type { DragResult } from "@/lib/calendar/drag";
import type { CalendarBlock, UnscheduledHabitChip } from "@/lib/calendar/block";
import { eventToCalendarBlock, habitToCalendarBlock, parseHabitBlockId, taskToCalendarBlock } from "@/lib/calendar/screen-blocks";
import { useCalendarRangeEvents } from "@/lib/calendar/use-calendar-range-events";
import type { ViewOptions } from "@/lib/view-options/schema";
import { CalendarNav } from "./calendar-nav";
import { CalendarView } from "./calendar-view";
import { CreateTaskFromRangeDialog } from "./create-task-from-range-dialog";

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
 * Mover o redimensionar un bloque de evento todavía no tiene mutación
 * propia wireada a esta pantalla (no hay UI de edición de eventos existentes
 * en ningún lado del repo todavía, y no hay forma de probarla de punta a
 * punta sin credenciales de Google cargadas): se avisa en vez de fallar en
 * silencio. Tarea y hábito sí están completos.
 */
export function ScreenCalendar({
  timezone,
  weekStartsOn,
  timeFormat,
  options,
  tasks,
  resolveTaskColor,
  createTaskProjectId,
}: {
  timezone: string;
  weekStartsOn: 0 | 1 | 6;
  timeFormat: 12 | 24;
  options: ViewOptions;
  /** Candidatas: cualquiera sin `due_date` ni `due_at` simplemente no se traduce a bloque (`taskToCalendarBlock`). */
  tasks: TaskRow[];
  resolveTaskColor: (task: TaskRow) => string;
  createTaskProjectId: string | null;
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

  const [createRange, setCreateRange] = useState<DragResult | null>(null);

  const visibleDays = useMemo(
    () => (anchorDate ? visibleDaysForFormat(options.formato_calendario, anchorDate, weekStartsOn) : []),
    [options.formato_calendario, anchorDate, weekStartsOn],
  );

  const rangeEvents = useCalendarRangeEvents(visibleDays, timezone);
  const rangeOverrides = useHabitScheduleOverridesForRange(visibleDays);

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t] as const)), [tasks]);
  const habitsById = useMemo(() => new Map((habits ?? []).map((h) => [h.id, h] as const)), [habits]);

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

  const eventBlocks = useMemo(() => {
    if (rangeEvents.data?.status !== "ok") return [];
    return rangeEvents.data.events.map(eventToCalendarBlock);
  }, [rangeEvents.data]);

  const blocks = useMemo(() => [...taskBlocks, ...habitBlocks, ...eventBlocks], [taskBlocks, habitBlocks, eventBlocks]);

  function handleSelectBlock(block: CalendarBlock) {
    if (block.type === "task") openTaskDetail(block.id);
    // Hábito y evento: sin un detalle propio que abrir todavía desde acá.
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
    toastError(
      "No pudimos mover el evento",
      "todavía no se puede editar un evento existente desde el calendario de Trazio",
      "Editalo directamente desde Google Calendar.",
    );
  }

  function handleScheduleHabitChip(chip: UnscheduledHabitChip, target: { date: string; time: string }) {
    const habit = habitsById.get(chip.id);
    if (!habit) return;
    setHabitOverride.mutate({ habitId: chip.id, habit, date: target.date, scheduledTime: target.time, timezone });
  }

  if (!now || !anchorDate) return null;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <CalendarNav
        format={options.formato_calendario}
        anchorDate={anchorDate}
        visibleDays={visibleDays}
        timezone={timezone}
        now={now}
        onNavigate={setAnchorDateOverride}
      />

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
    </div>
  );
}
