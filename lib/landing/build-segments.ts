import type { ParseMatch } from "@/lib/parser/types";

export type TextSegment = { text: string; match: ParseMatch | null };

/**
 * Corta `text` en tramos resaltados y sin resaltar según `matches` (bloque
 * 12.3). Función pura, compartida entre la demo interactiva (cliente) y las
 * vistas estáticas del servidor (hero, galería): ninguna de las dos necesita
 * volver a escribir esta lógica.
 */
export function buildSegments(text: string, matches: ParseMatch[]): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start), match: null });
    segments.push({ text: text.slice(match.start, match.end), match });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: null });
  return segments;
}
