"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import { reportHabitError } from "./errors";
import { habitAppliesOnDate, type HabitFrequencyFields } from "./today";

/** Prefijo común: `mutationKey` (no `HABITS_MUTATION_KEY` de `mutations.ts`, un override no cambia nada en `habitsQueryKey`) y base de las dos formas de leer overrides (por hábito y por fecha), para invalidar las dos con una sola llamada. */
const SCHEDULE_OVERRIDES_QUERY_BASE = ["habits", "schedule-overrides"] as const;
export const HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY = SCHEDULE_OVERRIDES_QUERY_BASE;

export function habitScheduleOverridesQueryKey(habitId: string) {
  return [...SCHEDULE_OVERRIDES_QUERY_BASE, habitId] as const;
}

export function habitScheduleOverridesByDateQueryKey(date: string) {
  return [...SCHEDULE_OVERRIDES_QUERY_BASE, "date", date] as const;
}

function assertAppliesOnDate(habit: HabitFrequencyFields, date: string): void {
  if (!habitAppliesOnDate(habit, date)) {
    throw new Error("Ese día no le corresponde al hábito según su frecuencia.");
  }
}

/**
 * Reprograma la hora de un hábito para un día puntual (tarea 2.6, requirement
 * "Reprogramación puntual del horario, sin mover el hábito de día"): un
 * `upsert` sobre `habit_schedule_overrides` sin tocar `habits.scheduled_time`.
 * Rechazado antes de llegar a la base si esa fecha no le corresponde al
 * hábito por su frecuencia — el mecanismo solo cambia el horario dentro de
 * un día que ya le toca, nunca lo hace aparecer en uno distinto.
 */
export function useSetHabitScheduleOverride() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY,
    mutationFn: async ({
      habitId,
      habit,
      date,
      scheduledTime,
    }: {
      habitId: string;
      habit: HabitFrequencyFields;
      date: string;
      scheduledTime: string;
    }) => {
      assertAppliesOnDate(habit, date);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { error } = await supabase
        .from("habit_schedule_overrides")
        .upsert(
          { user_id: session.user.id, habit_id: habitId, date, scheduled_time: scheduledTime },
          { onConflict: "habit_id,date" },
        );
      if (error) throw error;
    },
    onSuccess: () => toastSuccess("Horario reprogramado para ese día."),
    onError: reportHabitError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_OVERRIDES_QUERY_BASE }),
  });
}

/**
 * Hora reprogramada de un hábito para una fecha puntual, si existe (tarea
 * 3.11): no hay un hook de lectura para este módulo todavía, solo las
 * mutaciones de arriba. Misma `queryKey` que usan
 * `useSetHabitScheduleOverride`/`useRemoveHabitScheduleOverride` para
 * invalidar, así que guardar o quitar una reprogramación refresca esta
 * lectura sin un caso especial.
 */
export function useHabitScheduleOverride(habitId: string, date: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: habitScheduleOverridesQueryKey(habitId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_schedule_overrides")
        .select("scheduled_time")
        .eq("habit_id", habitId)
        .eq("date", date)
        .maybeSingle();
      if (error) throw error;
      return data?.scheduled_time ?? null;
    },
  });
}

/** Quita la reprogramación puntual de un día: el hábito vuelve a su `scheduled_time` habitual ese día. */
export function useRemoveHabitScheduleOverride() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABIT_SCHEDULE_OVERRIDES_MUTATION_KEY,
    mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
      const { error } = await supabase
        .from("habit_schedule_overrides")
        .delete()
        .eq("habit_id", habitId)
        .eq("date", date);
      if (error) throw error;
    },
    onError: reportHabitError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_OVERRIDES_QUERY_BASE }),
  });
}

/**
 * Overrides de hoy de todos los hábitos del usuario, en un mapa
 * `habit_id -> scheduled_time` (tarea 4.x, bug de fase 3: el bloque de
 * hábitos de Hoy tiene que mostrar la hora reprogramada, no la habitual).
 * Una sola consulta para todos los hábitos del día en vez de una por hábito
 * — `useHabitScheduleOverride` sigue existiendo tal cual para la tarjeta de
 * `/habitos`, que solo necesita el override de un hábito puntual al abrir
 * su popover de reprogramar. RLS ya acota a los propios.
 */
export function useHabitScheduleOverridesForDate(date: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: habitScheduleOverridesByDateQueryKey(date),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_schedule_overrides")
        .select("habit_id, scheduled_time")
        .eq("date", date);
      if (error) throw error;
      const entries = (data ?? []).map((row) => [row.habit_id, row.scheduled_time]);
      return Object.fromEntries(entries) as Record<string, string>;
    },
  });
}
