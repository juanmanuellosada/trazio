"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/client";
import { toastSuccess } from "@/lib/toast";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { reportReminderError } from "./errors";
import { remindersQueryKey } from "./use-reminders";

/** `mutationKey` común (bloque 4.10), mismo patrón D3 que el resto de los módulos de mutaciones. */
export const REMINDERS_MUTATION_KEY = ["reminders"] as const;

export type NewReminderInput =
  | { kind: "puntual"; remindAt: string }
  | { kind: "relativo"; offsetMinutes: number; dueAt: string | null; dueDate?: string | null };

/** Hora de referencia + zona horaria del usuario (`recordatorios-con-hora-de-referencia`, D-A): lo mínimo que `computeRemindAt` necesita para resolver un relativo sobre una tarea con solo fecha. */
export type ReferenceTimeInput = { referenceTime: string; timezone: string };

/**
 * Traduce el input del selector a `remind_at`/`offset_minutes` (bloque
 * 4.11, ampliado por `recordatorios-con-hora-de-referencia` D-B). Con
 * `dueAt` calcula directo sobre ese instante. Sin `dueAt` pero con
 * `dueDate`, combina la fecha con la hora de referencia y la zona horaria
 * del usuario (mismo patrón `fromZonedTime` que `lib/parser/dates.ts`).
 * Solo se rechaza cuando la tarea no tiene ninguna fecha: ahí sí no hay
 * contra qué calcular un desfase.
 */
export function computeRemindAt(
  input: NewReminderInput,
  reference: ReferenceTimeInput,
): { remind_at: string; offset_minutes: number | null } {
  if (input.kind === "puntual") {
    return { remind_at: input.remindAt, offset_minutes: null };
  }
  if (input.dueAt) {
    const remindAt = new Date(new Date(input.dueAt).getTime() + input.offsetMinutes * 60_000).toISOString();
    return { remind_at: remindAt, offset_minutes: input.offsetMinutes };
  }
  if (input.dueDate) {
    const base = fromZonedTime(`${input.dueDate}T${reference.referenceTime}`, reference.timezone);
    const remindAt = new Date(base.getTime() + input.offsetMinutes * 60_000).toISOString();
    return { remind_at: remindAt, offset_minutes: input.offsetMinutes };
  }
  throw new Error("recordatorio-relativo-sin-fecha");
}

/** Agrega un recordatorio a una tarea (bloque 4.10/4.11), puntual o relativo. No optimista: como la creación de una etiqueta, el id lo asigna el servidor y la frecuencia de uso no lo justifica. */
export function useAddReminder(taskId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { timezone, referenceTime } = useUserPreferences();

  return useMutation({
    mutationKey: REMINDERS_MUTATION_KEY,
    mutationFn: async (input: NewReminderInput) => {
      const { remind_at, offset_minutes } = computeRemindAt(input, { timezone, referenceTime: referenceTime ?? "09:00:00" });
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
