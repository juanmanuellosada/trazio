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

export function useReminders(taskId: string) {
  return useQuery({ queryKey: remindersQueryKey(taskId), queryFn: () => fetchReminders(taskId) });
}
