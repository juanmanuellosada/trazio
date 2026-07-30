"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CommentRow } from "./get-comments";

export function commentsQueryKey(taskId: string) {
  return ["comments", taskId] as const;
}

/**
 * Comentarios de una tarea, para el hilo del modal de detalle (bloque
 * 4.1/4.3). Orden cronológico ascendente, igual que `getComments`.
 */
export async function fetchComments(taskId: string): Promise<CommentRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, task_id, content, created_at, updated_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommentRow[];
}

export function useComments(taskId: string, initialData?: CommentRow[]) {
  return useQuery({
    queryKey: commentsQueryKey(taskId),
    queryFn: () => fetchComments(taskId),
    initialData,
  });
}
