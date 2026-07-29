import { formatDuration, formatWhen } from "@/lib/landing/format-parse-result";
import { TOKEN_DOT_CLASS } from "@/lib/landing/token-visuals";
import type { ParseResult } from "@/lib/parser/types";
import { cn } from "@/lib/utils";

/**
 * Los chips resultantes del parseo (bloque 12.1/12.3/12.4): mismo marcado en
 * el hero congelado, la demo interactiva y cada tarjeta de la galería. La
 * prioridad conserva su color semántico de la app (Urgente/Alta/Media/Baja,
 * `docs/design-system.md` §3) porque ahí lo que importa es el nivel, no el
 * tipo de token; los demás chips usan el color de su tipo (§2), el mismo que
 * el resaltado del texto — es lo que hace que el chip se sienta la
 * continuación visual de la marca en el texto.
 */
const PRIORITY_LABELS: Record<number, string> = { 1: "Urgente", 2: "Alta", 3: "Media", 4: "Baja" };
const PRIORITY_DOT: Record<number, string> = {
  1: "bg-priority-urgent",
  2: "bg-priority-high",
  3: "bg-priority-medium",
  4: "bg-priority-low",
};
const PRIORITY_TEXT: Record<number, string> = {
  1: "text-priority-urgent-text",
  2: "text-priority-high-text",
  3: "text-priority-medium-text",
  4: "text-priority-low-text",
};

export function ParseResultChips({ result, fallbackTitle }: { result: ParseResult; fallbackTitle?: string }) {
  const when = formatWhen(result);
  const isEmpty =
    !result.priority && !when && !result.durationMinutes && !result.recurrenceRule && result.labels.length === 0 && !result.project;

  return (
    <div className="space-y-3">
      <p className="text-base font-medium text-foreground">{result.title || fallbackTitle || ""}</p>
      <div className="flex flex-wrap gap-2">
        {result.priority ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium">
            <span className={cn("size-2 rounded-full", PRIORITY_DOT[result.priority])} aria-hidden />
            <span className={PRIORITY_TEXT[result.priority]}>{PRIORITY_LABELS[result.priority]}</span>
          </span>
        ) : null}
        {when ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
            <span className={cn("size-2 rounded-full", TOKEN_DOT_CLASS.date)} aria-hidden />
            {when}
          </span>
        ) : null}
        {result.durationMinutes ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
            <span className={cn("size-2 rounded-full", TOKEN_DOT_CLASS.duration)} aria-hidden />
            {formatDuration(result.durationMinutes)}
          </span>
        ) : null}
        {result.recurrenceRule ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
            <span className={cn("size-2 rounded-full", TOKEN_DOT_CLASS.recurrence)} aria-hidden />
            Se repite
          </span>
        ) : null}
        {result.labels.map((label) => (
          <span
            key={label.name}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-text-secondary"
          >
            <span className={cn("size-2 rounded-full", TOKEN_DOT_CLASS.label)} aria-hidden />
            @{label.name}
            {label.id === null ? " (se crea)" : ""}
          </span>
        ))}
        {result.project ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-text-secondary">
            <span className={cn("size-2 rounded-full", TOKEN_DOT_CLASS.project)} aria-hidden />
            #{result.project.name}
            {result.project.section ? `/${result.project.section.name}` : ""}
          </span>
        ) : null}
        {isEmpty ? <span className="text-xs text-text-secondary">Todavía no reconocimos ningún dato.</span> : null}
      </div>
    </div>
  );
}
