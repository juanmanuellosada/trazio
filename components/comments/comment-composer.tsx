"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Composer del hilo de comentarios (bloque 4.3): texto plano, sin editor
 * enriquecido (revierte D2 solo para comentarios, ver
 * `openspec/changes/comentarios-en-texto-plano/design.md`, decisión D-A),
 * con confirmación explícita ("Comentar") — el requirement dice "se escribe
 * y confirma un comentario", no que se guarde solo al tipear como la
 * descripción.
 */
export function CommentComposer({ onSubmit, pending }: { onSubmit: (content: string) => void; pending?: boolean }) {
  const [draft, setDraft] = useState("");

  function handleSubmit() {
    if (!draft.trim()) return;
    onSubmit(draft);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Escribí un comentario…"
        aria-label="Nuevo comentario"
        rows={2}
        disabled={pending}
        className="min-h-0 resize-none text-sm"
      />
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={handleSubmit} disabled={pending || !draft.trim()}>
          <Send className="size-3.5" /> Comentar
        </Button>
      </div>
    </div>
  );
}
