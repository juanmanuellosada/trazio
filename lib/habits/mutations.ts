"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { playCompletionSound } from "@/lib/completion-sound";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import { todayInTimeZone } from "@/lib/dates/today";
import type { HabitFormOutput } from "@/lib/validation/habits";
import { reportHabitError } from "./errors";
import { HABIT_COLUMNS, toHabit, type Habit, type HabitRawRow } from "./habit-columns";
import { HABIT_SKIPS_MUTATION_KEY, habitSkipQueryKey, habitSkipsByDateQueryKey } from "./skips";
import { isHabitCompletionsRangeQuery, patchHabitCompletionInRangeCache, type HabitCompletionsByDate } from "./completions";
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
 * El futuro no se puede marcar ni desmarcar (decisión del dueño: un día
 * pasado en que el hábito tocaba SÍ se puede corregir desde el calendario —
 * versión anterior de esta guarda, `assertIsToday`, solo dejaba pasar el día
 * de hoy). Rechazado en esta misma capa de datos, sin depender de que la
 * interfaz no ofrezca el casillero para un día futuro. `date` viaja como
 * argumento (no se recalcula acá con `new Date()`) para que el llamador use
 * la misma fecha con la que ya decidió mostrar el casillero.
 */
function assertNotFuture(date: string, timezone: string): void {
  if (date > todayInTimeZone(new Date(), timezone)) {
    throw new Error("No se puede marcar ni desmarcar un día futuro.");
  }
}

type MarkHabitVariables = { habitId: string; date: string; timezone: string };

/**
 * Marca un hábito como hecho hoy o en un día pasado en que le tocaba
 * (decisión del dueño: el futuro sigue prohibido, `assertNotFuture`).
 * También borra cualquier salteo de ese mismo día (`habit_skips`, tarea
 * 6.2/6.4 de `calendario-legible-y-manipulable`, D-F): los tres estados
 * —pendiente, cumplido, salteado— no pueden coexistir, y completar después
 * de saltear es justamente el camino "reversible" que describe el dueño. No
 * toca `calcular_racha_habito` ni su tabla: sigue siendo el mismo `insert`
 * en `habit_completions` de siempre, y D10 ya documenta que la racha
 * tolera esta clase de corrección retroactiva porque se calcula al leer.
 */
export function useMarkHabitDone() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABITS_MUTATION_KEY,
    mutationFn: async ({ habitId, date, timezone }: MarkHabitVariables) => {
      assertNotFuture(date, timezone);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { error } = await supabase
        .from("habit_completions")
        .insert({ user_id: session.user.id, habit_id: habitId, completed_on: date });
      if (error) throw error;

      const { error: skipError } = await supabase
        .from("habit_skips")
        .delete()
        .eq("habit_id", habitId)
        .eq("date", date);
      if (skipError) throw skipError;
    },
    onMutate: async ({ habitId, date, timezone }: MarkHabitVariables) => {
      await queryClient.cancelQueries({ queryKey: habitsQueryKey() });
      await queryClient.cancelQueries({ queryKey: habitSkipQueryKey(habitId, date) });
      await queryClient.cancelQueries({ queryKey: habitSkipsByDateQueryKey(date) });
      await queryClient.cancelQueries({ predicate: isHabitCompletionsRangeQuery });
      const previous = habitsSnapshot(queryClient);
      const previousSkipByHabit = queryClient.getQueryData<boolean>(habitSkipQueryKey(habitId, date));
      const previousSkipByDate = queryClient.getQueryData<Record<string, boolean>>(habitSkipsByDateQueryKey(date));
      const previousCompletionsRange = queryClient.getQueriesData<HabitCompletionsByDate>({ predicate: isHabitCompletionsRangeQuery });
      // `completed_today` es la marca de HOY únicamente (`habit-columns.ts`):
      // marcar un día pasado no lo toca, sino pintaría el hábito de hoy como
      // hecho por marcar un día distinto (defecto que este cambio corrige).
      if (date === todayInTimeZone(new Date(), timezone)) {
        queryClient.setQueryData<Habit[]>(habitsQueryKey(), (old) =>
          (old ?? []).map((h) => (h.id === habitId ? { ...h, completed_today: true } : h)),
        );
      }
      patchHabitCompletionInRangeCache(queryClient, habitId, date, true);
      queryClient.setQueryData(habitSkipQueryKey(habitId, date), false);
      queryClient.setQueryData<Record<string, boolean> | undefined>(habitSkipsByDateQueryKey(date), (old) => {
        if (!old) return old;
        return Object.fromEntries(Object.entries(old).filter(([id]) => id !== habitId));
      });
      return { previous, previousSkipByHabit, previousSkipByDate, previousCompletionsRange, habitId, date };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(habitsQueryKey(), context.previous);
      if (context) {
        queryClient.setQueryData(habitSkipQueryKey(context.habitId, context.date), context.previousSkipByHabit);
        queryClient.setQueryData(habitSkipsByDateQueryKey(context.date), context.previousSkipByDate);
        context.previousCompletionsRange.forEach(([key, data]) => queryClient.setQueryData(key, data));
      }
      reportHabitError(error);
    },
    // `sonido-al-completar` (D-E): marcar un hábito no tiene deshacer, así
    // que acá el sonido es la única confirmación de que el clic llegó — a
    // diferencia de una tarea, no hay tostada de deshacer para dudar.
    onSuccess: () => playCompletionSound(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: habitsQueryKey() });
      queryClient.invalidateQueries({ queryKey: HABIT_SKIPS_MUTATION_KEY });
      queryClient.invalidateQueries({ predicate: isHabitCompletionsRangeQuery });
    },
  });
}

/** Desmarca un hábito hecho hoy o en un día pasado: corrige un click de más (tarea 2.4, D-E) o una corrección retroactiva (decisión del dueño). */
export function useUnmarkHabitDone() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABITS_MUTATION_KEY,
    mutationFn: async ({ habitId, date, timezone }: MarkHabitVariables) => {
      assertNotFuture(date, timezone);
      const { error } = await supabase
        .from("habit_completions")
        .delete()
        .eq("habit_id", habitId)
        .eq("completed_on", date);
      if (error) throw error;
    },
    onMutate: async ({ habitId, date, timezone }: MarkHabitVariables) => {
      await queryClient.cancelQueries({ queryKey: habitsQueryKey() });
      await queryClient.cancelQueries({ predicate: isHabitCompletionsRangeQuery });
      const previous = habitsSnapshot(queryClient);
      const previousCompletionsRange = queryClient.getQueriesData<HabitCompletionsByDate>({ predicate: isHabitCompletionsRangeQuery });
      // Mismo motivo que en `useMarkHabitDone.onMutate`: `completed_today`
      // es la marca de HOY, desmarcar un día pasado no la toca.
      if (date === todayInTimeZone(new Date(), timezone)) {
        queryClient.setQueryData<Habit[]>(habitsQueryKey(), (old) =>
          (old ?? []).map((h) => (h.id === habitId ? { ...h, completed_today: false } : h)),
        );
      }
      patchHabitCompletionInRangeCache(queryClient, habitId, date, false);
      return { previous, previousCompletionsRange };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(habitsQueryKey(), context.previous);
      context?.previousCompletionsRange.forEach(([key, data]) => queryClient.setQueryData(key, data));
      reportHabitError(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: habitsQueryKey() });
      queryClient.invalidateQueries({ predicate: isHabitCompletionsRangeQuery });
    },
  });
}
