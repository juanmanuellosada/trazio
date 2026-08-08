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
 * `lib/tasks/today-count.ts` (servidor) y
 * `lib/pending-count/pending-today-count.ts` (cliente)—, que son dos
 * caminos de código distintos a propósito (D-H) pero
 * no pueden tener cada uno su propia noción de "pendiente" sin que los dos
 * números terminen contradiciéndose.
 *
 * D-G/D-F de `openspec/changes/recordatorios-de-habitos/design.md`: esta
 * misma regla —toca hoy y no se marcó, más el salteo, que acá no se
 * consulta porque el llamador ya filtra por `habit_skips` antes de contar—
 * está escrita otra vez en SQL, en el CTE `due` de
 * `claim_due_habit_reminders` (`supabase/migrations/20260808000000_habit_reminders.sql`).
 * Son la misma definición en dos lenguajes, no dos definiciones distintas:
 * si esta función cambia, esa consulta tiene que cambiar con ella (y
 * viceversa), y `supabase/tests/habit-reminders-claim.test.ts` es la red
 * que lo nota si algún día se separan.
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
