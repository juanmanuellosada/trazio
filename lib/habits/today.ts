import { getISODay, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { todayInTimeZone } from "@/lib/dates/today";
import type { Habit } from "./habit-columns";

export type HabitFrequencyFields = Pick<Habit, "frequency_type" | "days_of_week">;
export type HabitScheduleFields = HabitFrequencyFields & Pick<Habit, "created_at" | "is_archived">;

/**
 * Día de la semana de una fecha calendario (`yyyy-MM-dd`, sin hora), en la
 * misma codificación ISO-8601 que `habits.days_of_week` (1 lunes … 7
 * domingo, ver la migración `20260729170000_habits.sql`). `parseISO` de una
 * fecha sin hora no lleva zona horaria involucrada — no hay corrimiento de
 * día que evitar acá, a diferencia de un `timestamptz`.
 */
function isoDayOfWeek(dateIso: string): number {
  return getISODay(parseISO(dateIso));
}

/**
 * Si la frecuencia de un hábito lo hace tocar en `dateIso` (D-C de
 * `design.md`), sin mirar todavía si esa fecha es anterior a su creación o
 * si está archivado. Se usa tanto para "qué hábitos tocan hoy" como para
 * validar una reprogramación puntual (`lib/habits/schedule-overrides.ts`,
 * requirement "El override no mueve el hábito de día").
 *
 * `times_per_week` no fija días concretos: el hábito toca cualquier día de
 * la semana, y lo que cuenta es la cantidad de marcas alcanzadas contra
 * `times_per_week`, no en qué días se marcaron.
 */
export function habitAppliesOnDate(habit: HabitFrequencyFields, dateIso: string): boolean {
  if (habit.frequency_type === "specific_days") {
    return (habit.days_of_week ?? []).includes(isoDayOfWeek(dateIso));
  }
  return true;
}

/**
 * Si un hábito toca en `dateIso` (tarea 2.8): su frecuencia lo indica
 * (`habitAppliesOnDate`), la fecha no es anterior a su creación (requirement
 * "Un hábito no aparece en fechas anteriores a su creación") y no está
 * archivado (D-F: un hábito archivado desaparece de Hoy).
 */
export function isHabitDueOn(habit: HabitScheduleFields, dateIso: string, timezone: string): boolean {
  if (habit.is_archived) return false;
  const createdDate = formatInTimeZone(habit.created_at, timezone, "yyyy-MM-dd");
  if (dateIso < createdDate) return false;
  return habitAppliesOnDate(habit, dateIso);
}

/** Si un hábito toca hoy, en la zona horaria del usuario. `now` viaja explícito (nunca `new Date()` implícito) para que los tests fijen fecha. */
export function isHabitDueToday(habit: HabitScheduleFields, timezone: string, now: Date): boolean {
  return isHabitDueOn(habit, todayInTimeZone(now, timezone), timezone);
}

/** Los hábitos de una lista que tocan hoy, en el orden en que llegaron. */
export function habitsDueToday<T extends HabitScheduleFields>(habits: T[], timezone: string, now: Date): T[] {
  return habits.filter((habit) => isHabitDueToday(habit, timezone, now));
}

/**
 * Hora efectiva de un hábito para un día puntual (spec "Reprogramación
 * puntual del horario"): la del override de ese día si existe, si no la
 * habitual (`scheduled_time`). `null` en los dos casos es "todo el día".
 */
export function effectiveScheduledTime(
  habit: Pick<Habit, "scheduled_time">,
  overrideScheduledTime: string | null | undefined,
): string | null {
  return overrideScheduledTime ?? habit.scheduled_time;
}

export type HabitDueToday<T> = T & { effective_scheduled_time: string | null };

/**
 * Hábitos que tocan hoy, cada uno con su hora efectiva ya resuelta (tarea
 * 2.8 completa): `overridesByHabitId` es el mapa `habit_id -> scheduled_time`
 * de los overrides de hoy que ya trajo el llamador — este módulo no conoce
 * la forma de `habit_schedule_overrides`, solo resuelve la prioridad entre
 * el override y el horario habitual.
 */
export function habitsDueTodayWithEffectiveTime<T extends HabitScheduleFields & { id: string; scheduled_time: string | null }>(
  habits: T[],
  overridesByHabitId: Record<string, string>,
  timezone: string,
  now: Date,
): HabitDueToday<T>[] {
  return habitsDueToday(habits, timezone, now).map((habit) => ({
    ...habit,
    effective_scheduled_time: effectiveScheduledTime(habit, overridesByHabitId[habit.id]),
  }));
}
