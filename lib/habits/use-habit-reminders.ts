"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { reportHabitError } from "./errors";

/** Recordatorio de hábito ya persistido (tarea 5.3, mismo patrón que `ReminderRow` de `lib/reminders/use-reminders.ts`). */
export type HabitReminderRow = { id: string; habit_id: string; offset_minutes: number };

export function habitRemindersQueryKey(habitId: string) {
  return ["habit-reminders", habitId] as const;
}

/** Recordatorios de un hábito (spec "Los recordatorios se configuran desde el formulario del hábito"), orden por desfase — el más alejado de la hora primero, igual que se lee de arriba a abajo en el selector. */
export async function fetchHabitReminders(habitId: string): Promise<HabitReminderRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("habit_reminders")
    .select("id, habit_id, offset_minutes")
    .eq("habit_id", habitId)
    .order("offset_minutes", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** `enabled` cierra la consulta en modo alta (todavía sin `habitId`), mismo criterio que `useReminders` de tareas. */
export function useHabitReminders(habitId: string) {
  return useQuery({
    queryKey: habitRemindersQueryKey(habitId),
    queryFn: () => fetchHabitReminders(habitId),
    enabled: habitId !== "",
  });
}

/** `mutationKey` común (tarea 5.3), mismo patrón D3 que el resto de los módulos de mutaciones: `lib/realtime/handlers.ts` lo consulta antes de invalidar por un evento de Realtime sobre `habit_reminders`. */
export const HABIT_REMINDERS_MUTATION_KEY = ["habit-reminders"] as const;

/** Agrega un recordatorio a un hábito ya creado. En modo alta (sin `habitId` todavía), el diálogo maneja los recordatorios como borrador y los persiste recién junto con el hábito (`useCreateHabit`, `lib/habits/mutations.ts`) — este hook es solo para el hábito que ya existe. */
export function useAddHabitReminder(habitId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABIT_REMINDERS_MUTATION_KEY,
    mutationFn: async (offsetMinutes: number) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { error } = await supabase
        .from("habit_reminders")
        .insert({ user_id: session.user.id, habit_id: habitId, offset_minutes: offsetMinutes });
      if (error) throw error;
    },
    onError: reportHabitError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitRemindersQueryKey(habitId) }),
  });
}

/** Quita un recordatorio de un hábito. */
export function useRemoveHabitReminder(habitId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: HABIT_REMINDERS_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habit_reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onError: reportHabitError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: habitRemindersQueryKey(habitId) }),
  });
}
