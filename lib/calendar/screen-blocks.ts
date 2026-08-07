import { addDays, format, parseISO } from "date-fns";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { Habit } from "@/lib/habits/habit-columns";
import type { CalendarDate } from "@/lib/parser/dates";
import { formatDate } from "@/lib/parser/dates";
import { contrastRatio, MIN_PROJECT_COLOR_CONTRAST, PROJECT_SURFACE_HEX } from "@/lib/validation/colors";
import type { CalendarEventInstance } from "./events";
import type { CalendarBlock } from "./block";
import { instantFromDayMinutes, localMinutesOfDay } from "./drag";

/**
 * Traduce tareas, hábitos y eventos ya traídos por cada pantalla a la forma
 * común `CalendarBlock` (D-F de `design.md`, grupo 7 "montar `CalendarView`"):
 * esto vive en `lib/calendar/`, no en la grilla — `components/calendar/`
 * sigue sin importar nada de `lib/tasks/` ni `lib/habits/`.
 */

/** Duración de arranque para una tarea con horario (`due_at`) pero sin `duration_minutes` propia: misma regla que ya usa `calendar-view.tsx` para un bloque que no tenía duración previa. */
const DEFAULT_TASK_DURATION_MINUTES = 30;

/** Color de respaldo para un evento sin color de calendario resuelto (poco común: solo si `getCalendarColors` no pudo leer los calendarios). Único fallback (tarea 3.2): antes había uno acá y otro distinto en `event-row.tsx`, que ahora importa este mismo valor. */
export const EVENT_FALLBACK_COLOR = "#6B7280";

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const channel = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** Hacia negro en tema claro, hacia blanco en tema oscuro: mismo sentido que `PROJECT_COLORS` ya usa al elegir a mano un hex más oscuro para el tema claro y uno más claro para el oscuro. */
const BLEND_TARGET: Record<"light" | "dark", [number, number, number]> = { light: [0, 0, 0], dark: [255, 255, 255] };
const BLEND_STEP = 0.15;
const MAX_BLEND_STEPS = 6;

/**
 * Ajusta el color de un evento al tema (tarea 3.3, D-B): a diferencia del
 * color de un proyecto o etiqueta, que ya tiene un hex elegido a mano por
 * tema (`PROJECT_COLORS`) o que pasó la validación de contraste de D29 antes
 * de guardarse, el de Google es un hex crudo sin ninguna garantía de
 * legibilidad en el tema oscuro (ni en el claro). Se mezcla hacia
 * negro/blanco en pasos chicos hasta alcanzar el mismo piso de contraste que
 * ya exige un color personalizado de proyecto (`MIN_PROJECT_COLOR_CONTRAST`)
 * contra la superficie del tema que corresponda. Un color que ya alcanza ese
 * piso se devuelve sin tocar, y un hex inválido también.
 */
export function eventColorForTheme(hex: string, theme: "light" | "dark"): string {
  if (!HEX_COLOR_PATTERN.test(hex)) return hex;
  const target = BLEND_TARGET[theme];
  const surface = PROJECT_SURFACE_HEX[theme];
  let [r, g, b] = hexToRgb(hex);
  let result = hex;
  for (let step = 0; step < MAX_BLEND_STEPS && contrastRatio(result, surface) < MIN_PROJECT_COLOR_CONTRAST; step++) {
    r += (target[0] - r) * BLEND_STEP;
    g += (target[1] - g) * BLEND_STEP;
    b += (target[2] - b) * BLEND_STEP;
    result = rgbToHex(r, g, b);
  }
  return result;
}

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
 *
 * `projectName` es opcional y no lo resuelve esta función (tarea 2.3): quien
 * arma el bloque es quien ya tiene la lista de proyectos a mano (mismo
 * patrón que `resolveTaskColor`, que llega ya resuelto). Sin ese dato, el
 * peldaño de "proyecto" de la escalera de `CalendarBlockChip` simplemente no
 * tiene qué mostrar. `projectIcon` sigue el mismo criterio: `projects.icon`
 * es opcional en el dominio, así que puede faltar aun con `projectName`
 * presente.
 */
export function taskToCalendarBlock(
  task: TaskRow,
  colorHex: string,
  projectName?: string,
  projectIcon?: string,
  sectionName?: string,
  recurrenceRule?: string,
): CalendarBlock | null {
  const completed = task.completed_at != null;
  const labels = task.labels;
  if (task.due_at) {
    const durationMinutes = task.duration_minutes ?? DEFAULT_TASK_DURATION_MINUTES;
    const end = new Date(new Date(task.due_at).getTime() + durationMinutes * 60_000).toISOString();
    return {
      id: task.id,
      type: "task",
      title: task.title,
      color: colorHex,
      allDay: false,
      start: task.due_at,
      end,
      completed,
      labels,
      projectName,
      projectIcon,
      priority: task.priority,
      deadline: task.deadline,
      sectionName,
      recurrenceRule,
    };
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
      completed,
      labels,
      projectName,
      projectIcon,
      priority: task.priority,
      deadline: task.deadline,
      sectionName,
      recurrenceRule,
    };
  }
  return null;
}

/**
 * Bloque con horario de un hábito para un día puntual, ya sea con su
 * `scheduled_time` habitual o el de un override de ese día (quien arma esto
 * ya resolvió cuál corresponde). `completed` viaja como parámetro propio
 * (defecto "un hábito marcado hoy se pinta marcado en todos los días"):
 * `habit.completed_today` es un único booleano por hábito, el mismo para
 * cualquier ocurrencia del rango visible, así que no sirve para distinguir
 * qué día puntual está cumplido — quien arma esto ya resolvió el completado
 * de ESTA fecha leyendo `habit_completions` por rango
 * (`useHabitCompletionsForRange`, mismo criterio que ya usa `skipped` con
 * los salteos).
 *
 * `skipped` (grupo 7, D-F): un hábito salteado ese día se queda en el
 * calendario, marcado — no desaparece. `false` por defecto para quien
 * todavía no trae el salteo del rango visible.
 */
export function habitToCalendarBlock(
  habit: Pick<Habit, "id" | "name" | "icon" | "duration_minutes">,
  dateIso: string,
  scheduledTime: string,
  colorHex: string,
  timezone: string,
  completed: boolean,
  skipped = false,
  /** Frecuencia y racha ya en castellano (`formatHabitFrequency`/`formatStreak`, `lib/habits/format.ts`): resueltas por quien arma el bloque, para la ficha de más info (`calendario-mas-info`) — este módulo no importa `lib/habits/format.ts` (D-F). */
  frequencyText?: string,
  streakText?: string,
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
    completed,
    icon: habit.icon,
    skipped,
    habitFrequencyText: frequencyText,
    habitStreakText: streakText,
  };
}

/**
 * Bloques de vista previa de repeticiones futuras de una tarea recurrente
 * (tarea 5.7, D-F): mismo color y mismo `duration_minutes` (con el mismo
 * default) que `taskToCalendarBlock` — las únicas diferencias son
 * `isPreview: true` y que cada fecha es una ocurrencia futura calculada
 * aparte (`lib/recurrence/expand-range.ts`), no la fecha actual de la
 * tarea. Si la tarea tenía hora (`due_at`), cada ocurrencia conserva esa
 * misma hora del día; si no, queda de todo el día, igual que hoy.
 */
export function taskRecurrencePreviewBlocks(
  task: Pick<TaskRow, "id" | "title" | "due_at" | "duration_minutes">,
  occurrences: CalendarDate[],
  colorHex: string,
  timezone: string,
): CalendarBlock[] {
  const durationMinutes = task.duration_minutes ?? DEFAULT_TASK_DURATION_MINUTES;
  const timeMinutes = task.due_at ? localMinutesOfDay(new Date(task.due_at), timezone) : null;

  return occurrences.map((occurrence) => {
    const dateIso = formatDate(occurrence);
    const id = `${task.id}::preview::${dateIso}`;
    if (timeMinutes !== null) {
      return {
        id,
        type: "task",
        title: task.title,
        color: colorHex,
        allDay: false,
        start: instantFromDayMinutes(dateIso, timeMinutes, timezone).toISOString(),
        end: instantFromDayMinutes(dateIso, timeMinutes + durationMinutes, timezone).toISOString(),
        isPreview: true,
      };
    }
    return {
      id,
      type: "task",
      title: task.title,
      color: colorHex,
      allDay: true,
      start: dateIso,
      end: format(addDays(parseISO(dateIso), 1), "yyyy-MM-dd"),
      isPreview: true,
    };
  });
}

/**
 * Identidad de un bloque de evento (defecto encontrado al verificar el grupo
 * 7 de `calendario-legible-y-manipulable`): Google solo garantiza que
 * `event.id` sea único DENTRO de un calendario, no entre los calendarios
 * habilitados de una misma cuenta — dos calendarios distintos pueden traer
 * eventos con el mismo id crudo. `eventsById` en `screen-calendar.tsx`
 * indexaba solo por `event.id`, así que con una colisión el menú
 * contextual/diálogo de edición de un evento terminaba operando sobre el
 * otro, incluida su eliminación. La identidad de la interfaz pasa a ser
 * `calendario + evento`, mismo patrón que ya usa `habitBlockId` para
 * distinguir apariciones del mismo hábito en días distintos. El id crudo que
 * se le manda a Google (`event.id`, `event.calendarId`) no se toca: sigue
 * viajando aparte, sin pasar por acá.
 */
export function eventBlockId(calendarId: string, eventId: string): string {
  return `${calendarId}::${eventId}`;
}

/**
 * `calendarName` es opcional (tarea 2.2/4, `screen-calendar.tsx` ya la pasa
 * desde su propio wrapper con la lista de calendarios a mano, mismo patrón
 * que ya resuelve `calendarName` en `use-hoy-events.ts`): sin ese dato, el
 * peldaño de "calendario" de la escalera de `CalendarBlockChip` simplemente
 * no tiene qué mostrar.
 */
export function eventToCalendarBlock(event: CalendarEventInstance, calendarName?: string): CalendarBlock {
  return {
    id: eventBlockId(event.calendarId, event.id),
    type: "event",
    title: event.title,
    color: event.calendarColor ?? EVENT_FALLBACK_COLOR,
    allDay: event.allDay,
    start: event.start,
    end: event.end,
    calendarName,
    // Ya viaja con el evento (`CalendarEventInstance.description`), sin
    // consulta extra: a diferencia de la de una tarea (jsonb pesado, afuera
    // de `TaskRow` a propósito), esta no cuesta nada más traerla.
    description: event.description,
  };
}
