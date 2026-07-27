"use client";

import { useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { parse } from "@/lib/parser/parse";
import type { ParseMatch, ParserProject, ParseResult } from "@/lib/parser/types";
import { cn } from "@/lib/utils";

/**
 * Única isla cliente de la landing (G1/G2, bloque 12.3): importa `parse`
 * directo, sin API. `proyectos` trae los mismos nombres que el seed de datos
 * de ejemplo (`scripts/seed-landing-demo.mjs`) para que `@Trabajo` resuelva
 * de verdad, igual que lo vería alguien con cuenta. `etiquetas` sí queda
 * vacía: a diferencia de `@` (que nunca crea un proyecto — decisión ya
 * tomada del parser, bloque 9, OQ1), `#` crea una etiqueta implícita cuando
 * no hay coincidencia, así que `#trabajo` se ve tal cual lo vería alguien
 * que recién llega.
 */

const ZONA_HORARIA = "America/Argentina/Buenos_Aires";
const SEMANA_EMPIEZA_EN = 1 as const; // lunes — mismo default que `user_preferences.week_starts_on`

// Mismos nombres que `scripts/seed-landing-demo.mjs`.
const PROYECTOS_DEMO: ParserProject[] = [
  { id: "casa", name: "Casa", path: "Casa", sections: [] },
  { id: "trabajo", name: "Trabajo", path: "Trabajo", sections: [] },
  { id: "estudio", name: "Estudio", path: "Estudio", sections: [] },
];

const EJEMPLOS = [
  "Reunión con Ana el próximo martes a las 3pm por 45min p2 #trabajo @Trabajo",
  "Llamar al contador mañana a las 10",
  "Pagar el alquiler cada mes p1",
  "Gimnasio cada lunes, miércoles y viernes por 1h",
];

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

function formatDuration(minutes: number): string {
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

function formatWhen(result: ParseResult): string | null {
  if (result.dueAt) {
    return formatInTimeZone(result.dueAt, ZONA_HORARIA, "EEEE d 'de' MMMM, HH:mm'hs'", { locale: es });
  }
  if (result.dueDate) {
    const [y, m, d] = result.dueDate.split("-").map(Number);
    return format(new Date(y, m - 1, d), "EEEE d 'de' MMMM", { locale: es });
  }
  return null;
}

function buildSegments(text: string, matches: ParseMatch[]) {
  const segments: { text: string; match: ParseMatch | null }[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start), match: null });
    segments.push({ text: text.slice(match.start, match.end), match });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: null });
  return segments;
}

export function ParserDemo() {
  const [text, setText] = useState(EJEMPLOS[0]);
  const trackedInteraction = useRef(false);

  function trackInteractionOnce() {
    if (trackedInteraction.current) return;
    trackedInteraction.current = true;
    track("parser_demo_interaction");
  }

  const result = useMemo(
    () =>
      parse(text, {
        ahora: new Date(),
        zonaHoraria: ZONA_HORARIA,
        semanaEmpiezaEn: SEMANA_EMPIEZA_EN,
        proyectos: PROYECTOS_DEMO,
        etiquetas: [],
      }),
    [text],
  );

  const segments = useMemo(() => buildSegments(text, result.matches), [text, result.matches]);
  const when = formatWhen(result);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        {EJEMPLOS.map((ejemplo) => (
          <button
            key={ejemplo}
            type="button"
            onClick={() => {
              setText(ejemplo);
              trackInteractionOnce();
            }}
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-ring hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ejemplo}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="parser-demo-input" className="mb-1.5 block text-sm font-medium text-foreground">
          Escribí una tarea
        </label>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex items-center overflow-hidden rounded-lg border border-transparent px-3 py-2.5 text-base whitespace-pre-wrap text-foreground"
          >
            {segments.map((segment, index) =>
              segment.match ? (
                // `text-foreground` (no `text-primary`): en modo oscuro `--primary` es un
                // azul claro pensado para texto sobre fondo sólido, no para texto propio
                // sobre un fondo ya teñido con el mismo tono — ahí da 4.4:1, por debajo de
                // AA. El resaltado se transmite con el fondo + subrayado, no con el color
                // del texto (Lighthouse: 0 fallos de contraste con este cambio).
                <mark
                  key={index}
                  className="rounded-[3px] bg-primary/15 font-medium text-foreground underline decoration-primary/60 decoration-2 underline-offset-2"
                >
                  {segment.text}
                </mark>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </div>
          <Input
            id="parser-demo-input"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              trackInteractionOnce();
            }}
            placeholder="Ej.: reunión con Ana el martes a las 15 p2 #trabajo"
            className="h-auto min-h-11 w-full caret-foreground py-2.5 text-base text-transparent selection:bg-transparent"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        {text.trim() === "" ? (
          <p className="text-sm text-text-secondary">Empezá a escribir arriba para ver cómo Trazio lo entiende.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-base font-medium text-foreground">{result.title || text}</p>
            <div className="flex flex-wrap gap-2">
              {result.priority ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium">
                  <span className={cn("size-2 rounded-full", PRIORITY_DOT[result.priority])} aria-hidden />
                  <span className={PRIORITY_TEXT[result.priority]}>{PRIORITY_LABELS[result.priority]}</span>
                </span>
              ) : null}
              {when ? (
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                  {when}
                </span>
              ) : null}
              {result.durationMinutes ? (
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                  {formatDuration(result.durationMinutes)}
                </span>
              ) : null}
              {result.recurrenceRule ? (
                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
                  Se repite
                </span>
              ) : null}
              {result.labels.map((label) => (
                <span
                  key={label.name}
                  className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-text-secondary"
                >
                  #{label.name}
                  {label.id === null ? " (se crea)" : ""}
                </span>
              ))}
              {result.project ? (
                <span className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-text-secondary">
                  @{result.project.name}
                  {result.project.section ? `/${result.project.section.name}` : ""}
                </span>
              ) : null}
              {!result.priority && !when && !result.durationMinutes && !result.recurrenceRule && result.labels.length === 0 && !result.project ? (
                <span className="text-xs text-text-secondary">Todavía no reconocimos ningún dato.</span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
