import { isHabitDueToday, type HabitScheduleFields } from "./today";

/**
 * Un hábito con lo que hace falta para decidir si está pendiente de hoy:
 * los campos de frecuencia/archivado (`HabitScheduleFields`, `today.ts`) más
 * si ya se marcó hoy.
 */
export type PendingTodayHabit = HabitScheduleFields & { completed_today: boolean };

/**
 * Definición **única** de "hábito pendiente de hoy" (tarea 5.1, D-H de
 * `design.md`): toca hoy (`isHabitDueToday`, tarea 2.8) y todavía no se
 * marcó. La comparten los dos contadores que hoy no cuentan hábitos —
 * `lib/tasks/today-count.ts` (servidor) y `lib/reminders/use-app-badge.ts`
 * (cliente)—, que son dos caminos de código distintos a propósito (D-H) pero
 * no pueden tener cada uno su propia noción de "pendiente" sin que los dos
 * números terminen contradiciéndose.
 */
export function isHabitPendingToday(habit: PendingTodayHabit, timezone: string, now: Date): boolean {
  return isHabitDueToday(habit, timezone, now) && !habit.completed_today;
}

/** Cuántos hábitos de una lista están pendientes de hoy. */
export function countHabitsPendingToday<T extends PendingTodayHabit>(
  habits: T[],
  timezone: string,
  now: Date,
): number {
  return habits.filter((habit) => isHabitPendingToday(habit, timezone, now)).length;
}
