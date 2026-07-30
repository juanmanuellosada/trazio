"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Json } from "@/lib/supabase/database.types";
import { TaskDescriptionEditor } from "@/components/tasks/task-description-editor";

const EMPTY_DOC: Json = { type: "doc", content: [{ type: "paragraph" }] };

/** Un doc de Tiptap sin ningún nodo con contenido propio cuenta como vacío. */
function isEmptyDoc(content: Json): boolean {
  if (typeof content !== "object" || content === null || Array.isArray(content)) return true;
  const nodes = (content as { content?: Json[] }).content ?? [];
  return nodes.every((node) => {
    if (typeof node !== "object" || node === null || Array.isArray(node)) return true;
    const inner = (node as { content?: Json[] }).content;
    return !inner || inner.length === 0;
  });
}

/**
 * Composer del hilo de comentarios (bloque 4.3): mismo editor Tiptap que la
 * descripción de la tarea, con confirmación explícita ("Comentar") — el
 * requirement dice "se escribe y confirma un comentario", no que se guarde
 * solo al tipear como la descripción. `key={resetKey}` remonta el editor
 * después de publicar para vaciarlo: `TaskDescriptionEditor` solo lee su
 * prop `content` como valor inicial (deps `[]` de `useEditor`), así que
 * cambiarla sin remontar no lo vaciaría.
 */
export function CommentComposer({ onSubmit, pending }: { onSubmit: (content: Json) => void; pending?: boolean }) {
  const [draft, setDraft] = useState<Json>(EMPTY_DOC);
  const [resetKey, setResetKey] = useState(0);

  function handleSubmit() {
    if (isEmptyDoc(draft)) return;
    onSubmit(draft);
    setDraft(EMPTY_DOC);
    setResetKey((key) => key + 1);
  }

  return (
    <div className="space-y-2">
      <TaskDescriptionEditor key={resetKey} content={EMPTY_DOC} onChange={setDraft} disabled={pending} />
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={handleSubmit} disabled={pending || isEmptyDoc(draft)}>
          <Send className="size-3.5" /> Comentar
        </Button>
      </div>
    </div>
  );
}
