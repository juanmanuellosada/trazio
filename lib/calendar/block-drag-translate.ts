import { formatInTimeZone } from "date-fns-tz";
import { durationMinutesBetween, minutesToTimeString, localMinutesOfDay, type DragResult } from "./drag";
import type { EventInput } from "./events";

/**
 * Cada dominio traduce el mismo resultado de arrastre (`DragResult`, un
 * rango de instantes) a su propia mutación (tarea 6.3, D-F de
 * `design.md`): la grilla (`components/calendar/`) nunca importa nada de
 * `lib/tasks/` ni `lib/habits/` ni sabe qué hacer con lo que devuelve —
 * solo entrega "este bloque se movió a este rango" y quien monta la
 * pantalla (grupo 7) llama a la función de acá según `block.type`.
 *
 * Funciones puras a propósito: sin `supabase`, sin React, sin `fetch` —
 * fáciles de testear con fechas fijas (tarea 6.10) y reusables tanto desde
 * un `onMoveBlock` de arrastre como desde un camino sin arrastre que
 * también quiera construir el mismo patch.
 */

export type TaskDragPatch = { due_date: null; due_at: string; duration_minutes: number };

/**
 * Tarea (tarea 6.4, D9): moverla a un horario concreto la pasa a tener
 * hora, así que `due_date` se vacía y `due_at` recibe el instante — nunca
 * las dos con valor a la vez, que es justo lo que el constraint de la base
 * rechaza. La duración se recalcula del rango resultante: al mover se
 * conserva (la función de `drag.ts` que arma el rango ya lo garantiza), al
 * redimensionar es literalmente lo que cambió.
 */
export function taskDragPatch(result: DragResult): TaskDragPatch {
  return {
    due_date: null,
    due_at: result.start.toISOString(),
    duration_minutes: durationMinutesBetween(result.start.toISOString(), result.end.toISOString()),
  };
}

export type HabitDragOverride = { date: string; scheduledTime: string };

/**
 * Hábito (tarea 6.3/6.6, D-H): un arrastre —sea de un bloque ya
 * programado en la grilla o de un chip suelto sin horario— siempre escribe
 * un override del día puntual en `habit_schedule_overrides`, nunca toca
 * `habits.scheduled_time`. Solo importa el inicio: un override no tiene
 * duración propia, esa sigue viniendo de la configuración general del
 * hábito.
 */
export function habitDragOverride(start: Date, timezone: string): HabitDragOverride {
  return {
    date: formatInTimeZone(start, timezone, "yyyy-MM-dd"),
    scheduledTime: minutesToTimeString(localMinutesOfDay(start, timezone)),
  };
}

/**
 * Evento de Google (tarea 6.3): conserva todos los campos del evento que
 * ya existía (título, descripción, calendario, etc. — la grilla nunca los
 * tuvo, solo quien arma el `CalendarBlock` original los tiene a mano) y
 * solo reemplaza el rango. Un evento de todo el día no tiene horario que
 * mover en esta grilla horaria — se ignora el arrastre en vez de
 * inventarle un horario que no pidió.
 */
export function eventDragChanges<T extends { allDay: boolean; start: string; end: string }>(current: T, result: DragResult): T {
  if (current.allDay) return current;
  return { ...current, start: result.start.toISOString(), end: result.end.toISOString() };
}

export type EventChangeSource = {
  calendarId: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  start: string;
  end: string;
  timeZone: string | null;
};

/**
 * Arma el `EventInput` que pide `useUpdateEvent` (tarea 8.4/D24) a partir
 * del evento ya trasladado por `eventDragChanges`: los mismos campos, con
 * `timeZone` resuelto a la de la pantalla cuando el evento no traía una
 * propia (todo el día — `CalendarEventInstance.timeZone` es `null` en ese
 * caso).
 */
export function eventUpdateInput(source: EventChangeSource, fallbackTimeZone: string): EventInput {
  const { calendarId, title, description, location, allDay, start, end, timeZone } = source;
  return { calendarId, title, description, location, allDay, start, end, timeZone: timeZone ?? fallbackTimeZone };
}
