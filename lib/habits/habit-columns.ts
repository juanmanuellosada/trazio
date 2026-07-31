/**
 * Columnas y tipos de la lista de hábitos (bloque 2 de fase 3, tarea 2.1),
 * en un módulo sin `"use client"`: tanto `get-habits.ts` (Server Component)
 * como `use-habits.ts` (cliente) comparten la misma forma, igual que
 * `lib/tasks/task-columns.ts`.
 *
 * `habit_completions(completed_on)` viaja embebido y filtrado por la fecha
 * de hoy (ver el `.eq("habit_completions.completed_on", today)` en ambos
 * lectores): PostgREST filtra el recurso embebido, no la lista de hábitos,
 * así que cada hábito llega con 0 o 1 fila ahí — de eso sale
 * `completed_today` sin una segunda consulta ni traer todo el historial.
 */
export type HabitFrequencyType = "daily" | "times_per_week" | "specific_days";

export type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  duration_minutes: number;
  scheduled_time: string | null;
  frequency_type: HabitFrequencyType;
  times_per_week: number | null;
  days_of_week: number[] | null;
  is_archived: boolean;
  created_at: string;
  /** true si ya hay una marca en `habit_completions` para el día de hoy, en la zona horaria del usuario. */
  completed_today: boolean;
};

export const HABIT_COLUMNS =
  "id, name, icon, color, duration_minutes, scheduled_time, frequency_type, times_per_week, days_of_week, is_archived, created_at, habit_completions(completed_on)";

export type HabitRawRow = Omit<Habit, "completed_today"> & {
  habit_completions: { completed_on: string }[] | null;
};

export function toHabit(row: HabitRawRow): Habit {
  const { habit_completions, ...rest } = row;
  return { ...rest, completed_today: (habit_completions ?? []).length > 0 };
}
