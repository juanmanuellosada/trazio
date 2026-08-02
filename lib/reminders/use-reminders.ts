"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type ReminderRow = {
  id: string;
  task_id: string;
  remind_at: string;
  offset_minutes: number | null;
  delivered_at: string | null;
};

/**
 * Recordatorio todavía no persistido (bloque `alta-de-tareas-en-contexto`,
 * D-E): lo arma `ReminderPicker` en modo borrador, antes de que la tarea
 * exista. Mismos campos que `ReminderRow` salvo `task_id` (todavía no hay
 * ninguna) — `delivered_at` siempre `null`, para que las dos formas rendericen
 * con el mismo código.
 */
export type DraftReminder = { id: string; remind_at: string; offset_minutes: number | null; delivered_at: null };

export function remindersQueryKey(taskId: string) {
  return ["reminders", "task", taskId] as const;
}

/** Recordatorios de una tarea (bloque 4.10/4.11), orden por momento de entrega. */
export async function fetchReminders(taskId: string): Promise<ReminderRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("id, task_id, remind_at, offset_minutes, delivered_at")
    .eq("task_id", taskId)
    .order("remind_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * `enabled` cierra la consulta cuando todavía no hay `taskId` real (modo
 * borrador de `ReminderPicker` en el alta, D-E) — sin esto, pedir
 * recordatorios de una tarea que no existe fallaría contra la base en cada
 * apertura del alta.
 */
export function useReminders(taskId: string) {
  return useQuery({
    queryKey: remindersQueryKey(taskId),
    queryFn: () => fetchReminders(taskId),
    enabled: taskId !== "",
  });
}
