import { buildSegments } from "@/lib/landing/build-segments";
import { TOKEN_MARK_BASE_CLASS, TOKEN_MARK_CLASS } from "@/lib/landing/token-visuals";
import type { ParseMatch } from "@/lib/parser/types";
import { cn } from "@/lib/utils";

/**
 * Texto con los tokens del parser resaltados en su color de tipo (bloque
 * 12.1/12.3/12.4): sin `'use client'` ni estado propio, así que se puede
 * usar tanto desde Server Components (hero, galería) como desde la demo
 * interactiva sin sumar una isla cliente nueva.
 */
export function TokenHighlightedText({
  text,
  matches,
  className,
}: {
  text: string;
  matches: ParseMatch[];
  className?: string;
}) {
  const segments = buildSegments(text, matches);
  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark key={index} className={cn(TOKEN_MARK_BASE_CLASS, TOKEN_MARK_CLASS[segment.match.attr])}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </span>
  );
}
