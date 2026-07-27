"use client";

import { useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { Input } from "@/components/ui/input";
import { buildSegments } from "@/lib/landing/build-segments";
import { LANDING_DEMO_PROJECTS, LANDING_WEEK_START, LANDING_ZONE } from "@/lib/landing/demo-context";
import { DEMO_EXAMPLES } from "@/lib/landing/static-parses";
import { TOKEN_MARK_BASE_CLASS, TOKEN_MARK_CLASS } from "@/lib/landing/token-visuals";
import { parse } from "@/lib/parser/parse";
import { cn } from "@/lib/utils";
import { ParseResultChips } from "./parse-result-chips";

/**
 * Única isla cliente de la landing (G1/G2, bloque 12.2): importa `parse`
 * directo, sin API. Visualmente es el mismo campo del hero
 * (`HeroParserPreview`), que se vuelve interactivo al hidratar — mismo
 * resaltado por tipo de token, mismos chips de resultado
 * (`ParseResultChips`). El estado inicial ya viene parseado
 * (`DEMO_EXAMPLES[0]`, calculado en el primer render), así que se entiende
 * incluso antes de que el JavaScript termine de cargar.
 */
export function ParserDemo() {
  const [text, setText] = useState<string>(DEMO_EXAMPLES[0]);
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
        zonaHoraria: LANDING_ZONE,
        semanaEmpiezaEn: LANDING_WEEK_START,
        proyectos: LANDING_DEMO_PROJECTS,
        etiquetas: [],
      }),
    [text],
  );

  const segments = useMemo(() => buildSegments(text, result.matches), [text, result.matches]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        {DEMO_EXAMPLES.map((ejemplo) => (
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
                <mark key={index} className={cn(TOKEN_MARK_BASE_CLASS, TOKEN_MARK_CLASS[segment.match.attr])}>
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
          <ParseResultChips result={result} fallbackTitle={text} />
        )}
      </div>
    </div>
  );
}
