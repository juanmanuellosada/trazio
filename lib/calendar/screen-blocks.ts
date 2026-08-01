import { addDays, format, parseISO } from "date-fns";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { Habit } from "@/lib/habits/habit-columns";
import type { CalendarEventInstance } from "./events";
import type { CalendarBlock } from "./block";
import { instantFromDayMinutes } from "./drag";

/**
 * Traduce tareas, hábitos y eventos ya traídos por cada pantalla a la forma
 * común `CalendarBlock` (D-F de `design.md`, grupo 7 "montar `CalendarView`"):
 * esto vive en `lib/calendar/`, no en la grilla — `components/calendar/`
 * sigue sin importar nada de `lib/tasks/` ni `lib/habits/`.
 */

/** Duración de arranque para una tarea con horario (`due_at`) pero sin `duration_minutes` propia: misma regla que ya usa `calendar-view.tsx` para un bloque que no tenía duración previa. */
const DEFAULT_TASK_DURATION_MINUTES = 30;

/** Color de respaldo para un evento sin color de calendario resuelto (poco común: solo si `getCalendarColors` no pudo leer los calendarios). */
export const EVENT_FALLBACK_COLOR = "#6B7280";

const HABIT_BLOCK_ID_SEPARATOR = "::";

/** El `id` de un bloque de hábito lleva la fecha porque el mismo hábito puede tocar varios días del rango visible (semana/mes): cada aparición necesita un `id` propio para arrastre y `key` de React. */
export function habitBlockId(habitId: string, dateIso: string): string {
  return `${habitId}${HABIT_BLOCK_ID_SEPARATOR}${dateIso}`;
}

export function parseHabitBlockId(blockId: string): string {
  return blockId.split(HABIT_BLOCK_ID_SEPARATOR)[0]!;
}

function minutesFromTimeString(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

/**
 * Una tarea sin `due_date` ni `due_at` no tiene dónde ubicarse en una grilla
 * temporal: no se traduce a bloque (sigue existiendo en la lista/el panel,
 * simplemente no aparece en el calendario).
 */
export function taskToCalendarBlock(task: TaskRow, colorHex: string): CalendarBlock | null {
  if (task.due_at) {
    const durationMinutes = task.duration_minutes ?? DEFAULT_TASK_DURATION_MINUTES;
    const end = new Date(new Date(task.due_at).getTime() + durationMinutes * 60_000).toISOString();
    return { id: task.id, type: "task", title: task.title, color: colorHex, allDay: false, start: task.due_at, end };
  }
  if (task.due_date) {
    return {
      id: task.id,
      type: "task",
      title: task.title,
      color: colorHex,
      allDay: true,
      start: task.due_date,
      end: format(addDays(parseISO(task.due_date), 1), "yyyy-MM-dd"),
    };
  }
  return null;
}

/** Bloque con horario de un hábito para un día puntual, ya sea con su `scheduled_time` habitual o el de un override de ese día (quien arma esto ya resolvió cuál corresponde). */
export function habitToCalendarBlock(
  habit: Pick<Habit, "id" | "name" | "duration_minutes">,
  dateIso: string,
  scheduledTime: string,
  colorHex: string,
  timezone: string,
): CalendarBlock {
  const startMinutes = minutesFromTimeString(scheduledTime);
  return {
    id: habitBlockId(habit.id, dateIso),
    type: "habit",
    title: habit.name,
    color: colorHex,
    allDay: false,
    start: instantFromDayMinutes(dateIso, startMinutes, timezone).toISOString(),
    end: instantFromDayMinutes(dateIso, startMinutes + habit.duration_minutes, timezone).toISOString(),
  };
}

export function eventToCalendarBlock(event: CalendarEventInstance): CalendarBlock {
  return {
    id: event.id,
    type: "event",
    title: event.title,
    color: event.calendarColor ?? EVENT_FALLBACK_COLOR,
    allDay: event.allDay,
    start: event.start,
    end: event.end,
  };
}
