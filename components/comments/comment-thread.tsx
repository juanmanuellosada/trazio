"use client";

import { useComments } from "@/lib/comments/use-comments";
import { useCreateComment, useDeleteComment, useUpdateComment } from "@/lib/comments/mutations";
import { CommentItem } from "./comment-item";
import { CommentComposer } from "./comment-composer";

/**
 * Hilo de comentarios de una tarea (bloque 4.1/4.3), montado en el detalle
 * de tarea (`task-detail-content.tsx`). Sin autor visible: Trazio no tiene
 * equipos ni tareas compartidas (`CLAUDE.md`), así que todo comentario de
 * una tarea es de la misma persona — solo importa cuándo se escribió y si
 * se editó.
 */
export function CommentThread({ taskId }: { taskId: string }) {
  const { data: comments } = useComments(taskId);
  const createComment = useCreateComment(taskId);
  const updateComment = useUpdateComment(taskId);
  const deleteComment = useDeleteComment(taskId);

  return (
    <div className="space-y-3">
      {comments && comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onSave={(content) => updateComment.mutate({ id: comment.id, content })}
              onDelete={() => deleteComment.mutate(comment.id)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">Todavía no hay comentarios en esta tarea.</p>
      )}
      <CommentComposer onSubmit={(content) => createComment.mutate(content)} pending={createComment.isPending} />
    </div>
  );
}
