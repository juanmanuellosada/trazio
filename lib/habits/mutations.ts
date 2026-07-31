"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import { todayInTimeZone } from "@/lib/dates/today";
import type { HabitFormOutput } from "@/lib/validation/habits";
import { reportHabitError } from "./errors";
import { HABIT_COLUMNS, toHabit, type Habit, type HabitRawRow } from "./habit-columns";
import { habitsQueryKey } from "./use-habits";

/**
 * Todas las mutaciones de hábitos del bloque 2 (tareas 2.2/2.3/2.4/2.5),
 * sobre el mismo patrón que `lib/labels/mutations.ts` y `lib/tasks/mutations.ts`:
 * TanStack Query, optimistic updates en editar y marcar/desmarcar, revertir
 * y avisar con el formato de tres partes si el servidor rechaza. Sin pila
 * de deshacer (D-E): `Ctrl/Cmd+Z` no cubre hábitos, desmarcar ya es la
 * operación inversa disponible.
 */

/** `mutationKey` común a este módulo (tarea 2.9): `lib/realtime/handlers.ts` lo usa con `queryClient.isMutating` antes de invalidar por un evento de Realtime sobre `habits`/`habit_completions`. */
export const HABITS_MUTATION_KEY = ["habits"] as const;

function habitsSnapshot(queryClient: QueryClient) {
  return queryClient.getQueryData<Habit[]>(habitsQueryKey());
}

/** Crea un hábito (tarea 2.2). No es optimista: el `id` lo asigna el servidor, mismo criterio que `useCreateLabel`. */
export function useCreateHabit() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABITS_MUTATION_KEY,
    mutationFn: async (input: HabitFormOutput) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { data, error } = await supabase
        .from("habits")
        .insert({
          user_id: session.user.id,
          name: input.name,
          icon: input.icon,
          color: input.color,
          duration_minutes: input.duration_minutes,
          scheduled_time: input.scheduled_time,
          frequency_type: input.frequency_type,
          times_per_week: input.frequency_type === "times_per_week" ? input.times_per_week : null,
          days_of_week: input.frequency_type === "specific_days" ? input.days_of_week : null,
        })
        .select(HABIT_COLUMNS)
        .single();
      if (error) throw error;
      return toHabit(data as unknown as HabitRawRow);
    },
    onSuccess: () => toastSuccess("Hábito creado."),
    onError: reportHabitError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsQueryKey() }),
  });
}

export type HabitPatch = Partial<
  Pick<
    Habit,
    | "name"
    | "icon"
    | "color"
    | "duration_minutes"
    | "scheduled_time"
    | "frequency_type"
    | "times_per_week"
    | "days_of_week"
    | "is_archived"
  >
>;

/**
 * Al cambiar `frequency_type`, el campo del tipo anterior tiene que
 * limpiarse: los checks de la migración `20260729170000_habits.sql` exigen
 * `times_per_week`/`days_of_week` en `null` para cualquier tipo que no sea
 * el suyo, y una fila existente conserva el valor del tipo anterior hasta
 * que algo lo pisa. Sin esto, editar de "3 veces por semana" a "todos los
 * días" viola el check constraint en la base.
 */
function normalizeFrequencyPatch(patch: HabitPatch): HabitPatch {
  if (!patch.frequency_type) return patch;
  return {
    ...patch,
    times_per_week: patch.frequency_type === "times_per_week" ? (patch.times_per_week ?? null) : null,
    days_of_week: patch.frequency_type === "specific_days" ? (patch.days_of_week ?? null) : null,
  };
}

/**
 * Edita un hábito (tarea 2.2): cualquier campo propio, incluido
 * `is_archived` (tarea 2.3, archivar y desarchivar) — un `update` común no
 * toca `habit_completions` ni `habit_schedule_overrides`, así que el
 * historial queda intacto en los dos sentidos.
 */
export function useUpdateHabit() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABITS_MUTATION_KEY,
    mutationFn: async ({ id, patch }: { id: string; patch: HabitPatch }) => {
      const { error } = await supabase.from("habits").update(normalizeFrequencyPatch(patch)).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: habitsQueryKey() });
      const previous = habitsSnapshot(queryClient);
      const dbPatch = normalizeFrequencyPatch(patch);
      queryClient.setQueryData<Habit[]>(habitsQueryKey(), (old) =>
        (old ?? []).map((h) => (h.id === id ? { ...h, ...dbPatch } : h)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(habitsQueryKey(), context.previous);
      reportHabitError(error);
    },
    onSuccess: (_data, { patch }) => {
      if ("is_archived" in patch) {
        toastSuccess(patch.is_archived ? "Hábito archivado." : "Hábito desarchivado.");
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsQueryKey() }),
  });
}

/** Elimina un hábito (tarea 2.2): la cascada de `habit_completions` y `habit_schedule_overrides` la garantiza `on delete cascade` en la base. */
export function useDeleteHabit() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABITS_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: habitsQueryKey() });
      const previous = habitsSnapshot(queryClient);
      queryClient.setQueryData<Habit[]>(habitsQueryKey(), (old) => (old ?? []).filter((h) => h.id !== id));
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(habitsQueryKey(), context.previous);
      reportHabitError(error);
    },
    onSuccess: () => toastSuccess("Hábito eliminado."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsQueryKey() }),
  });
}

/**
 * Solo hoy se puede marcar o desmarcar (tarea 2.5, D-E): rechazado en esta
 * misma capa de datos, sin depender de que la interfaz no ofrezca el
 * casillero para otros días. `date` viaja como argumento (no se recalcula
 * acá con `new Date()`) para que el llamador use la misma fecha con la que
 * ya decidió mostrar el casillero.
 */
function assertIsToday(date: string, timezone: string): void {
  if (date !== todayInTimeZone(new Date(), timezone)) {
    throw new Error("Solo se puede marcar o desmarcar el día de hoy.");
  }
}

type MarkHabitVariables = { habitId: string; date: string; timezone: string };

/** Marca el hábito de hoy como hecho (tarea 2.4). */
export function useMarkHabitDone() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABITS_MUTATION_KEY,
    mutationFn: async ({ habitId, date, timezone }: MarkHabitVariables) => {
      assertIsToday(date, timezone);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { error } = await supabase
        .from("habit_completions")
        .insert({ user_id: session.user.id, habit_id: habitId, completed_on: date });
      if (error) throw error;
    },
    onMutate: async ({ habitId }: MarkHabitVariables) => {
      await queryClient.cancelQueries({ queryKey: habitsQueryKey() });
      const previous = habitsSnapshot(queryClient);
      queryClient.setQueryData<Habit[]>(habitsQueryKey(), (old) =>
        (old ?? []).map((h) => (h.id === habitId ? { ...h, completed_today: true } : h)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(habitsQueryKey(), context.previous);
      reportHabitError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsQueryKey() }),
  });
}

/** Desmarca el hábito de hoy: corrige un click de más (tarea 2.4, D-E). */
export function useUnmarkHabitDone() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABITS_MUTATION_KEY,
    mutationFn: async ({ habitId, date, timezone }: MarkHabitVariables) => {
      assertIsToday(date, timezone);
      const { error } = await supabase
        .from("habit_completions")
        .delete()
        .eq("habit_id", habitId)
        .eq("completed_on", date);
      if (error) throw error;
    },
    onMutate: async ({ habitId }: MarkHabitVariables) => {
      await queryClient.cancelQueries({ queryKey: habitsQueryKey() });
      const previous = habitsSnapshot(queryClient);
      queryClient.setQueryData<Habit[]>(habitsQueryKey(), (old) =>
        (old ?? []).map((h) => (h.id === habitId ? { ...h, completed_today: false } : h)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(habitsQueryKey(), context.previous);
      reportHabitError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitsQueryKey() }),
  });
}
