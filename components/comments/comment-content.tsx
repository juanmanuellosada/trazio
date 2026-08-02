/**
 * Contenido de un comentario en modo lectura (bloque 4.3): texto plano, sin
 * editor Tiptap — el comentario es una nota al margen de la tarea, no su
 * cuerpo (revierte D2 solo para comentarios, ver decisión D-C en
 * `openspec/changes/comentarios-en-texto-plano/design.md`). `whitespace-
 * pre-wrap` conserva los saltos de línea que haya escrito la persona sin
 * convertir nada de lo escrito en formato.
 */
export function CommentContent({ content }: { content: string }) {
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{content}</p>;
}
