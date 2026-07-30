"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Json } from "@/lib/supabase/database.types";
import type { CommentRow } from "@/lib/comments/get-comments";
import { TaskDescriptionEditor } from "@/components/tasks/task-description-editor";
import { CommentContent } from "./comment-content";

function formatTimestamp(iso: string): string {
  return format(new Date(iso), "d 'de' MMMM, HH:mm", { locale: es });
}

/**
 * Un comentario del hilo (bloque 4.4): fecha, marca "editado" cuando
 * `updated_at` difiere de `created_at`, y edición inline que reemplaza la
 * vista de lectura por el mismo editor mientras dura.
 */
export function CommentItem({
  comment,
  onSave,
  onDelete,
}: {
  comment: CommentRow;
  onSave: (content: Json) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Json>(comment.content);
  const edited = comment.updated_at !== comment.created_at;

  function save() {
    onSave(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(comment.content);
    setEditing(false);
  }

  return (
    <div className="group space-y-1.5 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-text-secondary">
          {formatTimestamp(comment.created_at)}
          {edited && " · editado"}
        </span>
        {!editing && (
          <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Editar comentario"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" aria-label="Eliminar comentario" onClick={onDelete}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <TaskDescriptionEditor content={comment.content} onChange={setDraft} />
          <div className="flex justify-end gap-1.5">
            <Button type="button" variant="ghost" size="sm" onClick={cancel}>
              Cancelar
            </Button>
            <Button type="button" size="sm" onClick={save}>
              Guardar
            </Button>
          </div>
        </div>
      ) : (
        <CommentContent content={comment.content} />
      )}
    </div>
  );
}
