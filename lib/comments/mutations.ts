"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";
import { reportCommentError } from "./errors";
import { commentsQueryKey } from "./use-comments";
import type { CommentRow } from "./get-comments";

/**
 * `mutationKey` común (bloque 4.2), mismo patrón D3 que
 * `TASKS_MUTATION_KEY`/`LABELS_MUTATION_KEY`: permite que
 * `lib/realtime/handlers.ts` distinga si hay una mutación de comentarios
 * en vuelo antes de invalidar por un evento de Realtime.
 */
export const COMMENTS_MUTATION_KEY = ["comments"] as const;

/** Crea un comentario (bloque 4.2, requirement "Crear un comentario desde el modal de detalle"). Optimista: aparece en el hilo al instante con un id temporal. */
export function useCreateComment(taskId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const queryKey = commentsQueryKey(taskId);

  return useMutation({
    mutationKey: COMMENTS_MUTATION_KEY,
    mutationFn: async (content: Json) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No hay sesión activa.");

      const { data, error } = await supabase
        .from("comments")
        .insert({ user_id: session.user.id, task_id: taskId, content })
        .select("id, task_id, content, created_at, updated_at")
        .single();
      if (error) throw error;
      return data as CommentRow;
    },
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentRow[]>(queryKey);
      const now = new Date().toISOString();
      const optimistic: CommentRow = {
        id: `temp-${now}`,
        task_id: taskId,
        content,
        created_at: now,
        updated_at: now,
      };
      queryClient.setQueryData<CommentRow[]>(queryKey, (old) => [...(old ?? []), optimistic]);
      return { previous };
    },
    onError: (error, _content, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      reportCommentError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

/** Edita un comentario (bloque 4.2/4.4): optimista, `updated_at` local queda distinto de `created_at` para mostrar la marca "editado" hasta que el servidor confirme el valor real. */
export function useUpdateComment(taskId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const queryKey = commentsQueryKey(taskId);

  return useMutation({
    mutationKey: COMMENTS_MUTATION_KEY,
    mutationFn: async ({ id, content }: { id: string; content: Json }) => {
      const { error } = await supabase.from("comments").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, content }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentRow[]>(queryKey);
      queryClient.setQueryData<CommentRow[]>(queryKey, (old) =>
        (old ?? []).map((comment) =>
          comment.id === id ? { ...comment, content, updated_at: new Date().toISOString() } : comment,
        ),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      reportCommentError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

/** Elimina un comentario (bloque 4.2, requirement "Eliminar un comentario"). Optimista. */
export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  const queryKey = commentsQueryKey(taskId);

  return useMutation({
    mutationKey: COMMENTS_MUTATION_KEY,
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CommentRow[]>(queryKey);
      queryClient.setQueryData<CommentRow[]>(queryKey, (old) => (old ?? []).filter((comment) => comment.id !== id));
      return { previous };
    },
    onError: (error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      reportCommentError(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
