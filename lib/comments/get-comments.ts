import { createClient } from "@/lib/supabase/server";

export type CommentRow = {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

/**
 * Comentarios de una tarea (bloque 4.1), orden cronológico ascendente: el
 * hilo se lee de arriba hacia abajo como una conversación. Mismo patrón de
 * lectura por servidor que `lib/labels/get-labels.ts`, para sembrar el
 * caché de TanStack Query de `useComments` desde un Server Component si
 * hiciera falta más adelante — hoy el hilo del modal de detalle (bloque
 * 4.3) fetchea del lado del cliente, igual que `LabelPicker`.
 */
export async function getComments(taskId: string): Promise<CommentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("comments")
    .select("id, task_id, content, created_at, updated_at")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  return (data ?? []) as CommentRow[];
}
