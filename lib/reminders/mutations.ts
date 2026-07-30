"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import { reportReminderError } from "./errors";
import { remindersQueryKey } from "./use-reminders";

/** `mutationKey` común (bloque 4.10), mismo patrón D3 que el resto de los módulos de mutaciones. */
export const REMINDERS_MUTATION_KEY = ["reminders"] as const;

export type NewReminderInput =
  | { kind: "puntual"; remindAt: string }
  | { kind: "relativo"; offsetMinutes: number; dueAt: string | null };

/**
 * Traduce el input del selector a `remind_at`/`offset_minutes` (bloque
 * 4.11). Un recordatorio relativo sin `due_at` se rechaza acá mismo, antes
 * de llegar a la base — requirement "un recordatorio relativo exige que la
 * tarea tenga fecha y hora".
 */
export function computeRemindAt(input: NewReminderInput): { remind_at: string; offset_minutes: number | null } {
  if (input.kind === "puntual") {
    return { remind_at: input.remindAt, offset_minutes: null };
  }
  if (!input.dueAt) {
    throw new Error("recordatorio-relativo-sin-hora");
  }
  const remindAt = new Date(new Date(input.dueAt).getTime() + input.offsetMinutes * 60_000).toISOString();
  return { remind_at: remindAt, offset_minutes: input.offsetMinutes };
}

/** Agrega un recordatorio a una tarea (bloque 4.10/4.11), puntual o relativo. No optimista: como la creación de una etiqueta, el id lo asigna el servidor y la frecuencia de uso no lo justifica. */
export function useAddReminder(taskId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: REMINDERS_MUTATION_KEY,
    mutationFn: async (input: NewReminderInput) => {
      const { remind_at, offset_minutes } = computeRemindAt(input);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { error } = await supabase
        .from("reminders")
        .insert({ user_id: session.user.id, task_id: taskId, remind_at, offset_minutes });
      if (error) throw error;
    },
    onSuccess: () => toastSuccess("Recordatorio agregado."),
    onError: reportReminderError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: remindersQueryKey(taskId) }),
  });
}

/** Quita un recordatorio de una tarea (bloque 4.10). */
export function useRemoveReminder(taskId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationKey: REMINDERS_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders").delete().eq("id", id);
      if (error) throw error;
    },
    onError: reportReminderError,
    onSettled: () => queryClient.invalidateQueries({ queryKey: remindersQueryKey(taskId) }),
  });
}
