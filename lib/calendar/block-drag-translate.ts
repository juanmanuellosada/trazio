import { formatInTimeZone } from "date-fns-tz";
import { durationMinutesBetween, minutesToTimeString, localMinutesOfDay, type AllDayDragResult, type DragResult } from "./drag";
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

export type TaskAllDayPatch = { due_at: null; due_date: string };

/**
 * Tarea soltada en la fila de todo el día (reporte "una tarea de todo el
 * día no se puede arrastrar a otro día"): el espejo de `taskDragPatch` —
 * ahí `due_date` se vacía para que la tarea pase a tener hora, acá se
 * vacía `due_at` para que la pierda. Las dos columnas siguen siendo
 * excluyentes (D9), que es lo que el constraint de la base exige.
 *
 * `duration_minutes` no se toca: una tarea de todo el día no la muestra en
 * ningún lado, y borrarla haría perder la duración estimada que el usuario
 * ya había puesto si después vuelve a darle horario.
 */
export function taskAllDayPatch(result: AllDayDragResult): TaskAllDayPatch {
  return { due_at: null, due_date: result.startDate };
}

export type HabitDragOverride = { date: string; scheduledTime: string };

/**
 * Hábito (tarea 6.3/6.6, D-H): mover un bloque ya programado en la grilla
 * escribe un override del día puntual en `habit_schedule_overrides`, nunca
 * toca `habits.scheduled_time` (ese horario habitual queda para cualquier
 * otro día). Solo importa el inicio: un override no tiene duración propia,
 * esa sigue viniendo de la configuración general del hábito.
 *
 * Arrastrar el chip de un hábito *sin* horario es un camino distinto
 * (`handleScheduleHabitChip` en `screen-calendar.tsx`): ahí no hay un
 * horario habitual que preservar, así que fija `habits.scheduled_time`
 * directamente en vez de pasar por acá.
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

/**
 * Evento de Google soltado en la fila de todo el día: conserva todos sus
 * campos (igual que `eventDragChanges`) y solo reemplaza el rango por las
 * dos fechas `yyyy-MM-dd` que pide Google para un evento de todo el día,
 * marcándolo como tal. A diferencia de `eventDragChanges`, acá sí tiene
 * sentido para un evento que ya era de todo el día: eso es justamente
 * moverlo de fecha.
 */
export function eventAllDayChanges<T extends { allDay: boolean; start: string; end: string }>(current: T, result: AllDayDragResult): T {
  return { ...current, allDay: true, start: result.startDate, end: result.endDate };
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
