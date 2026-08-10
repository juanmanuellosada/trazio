"use client";

import { useMemo, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { Textarea } from "@/components/ui/textarea";
import { buildSegments } from "@/lib/landing/build-segments";
import { LANDING_DEMO_PROJECTS, LANDING_WEEK_START, LANDING_ZONE } from "@/lib/landing/demo-context";
import { DEMO_EXAMPLES } from "@/lib/landing/static-parses";
import { TOKEN_MARK_BASE_CLASS, TOKEN_MARK_CLASS } from "@/lib/landing/token-visuals";
import { parse } from "@/lib/parser/parse";
import { cn } from "@/lib/utils";
import { ParseResultChips } from "./parse-result-chips";

/**
 * Única isla cliente de la landing (G1/G2): se embebe directo en
 * `HeroSection` (`landing-para-la-vida-entera` — antes vivía en una sección
 * aparte, más abajo, con un campo congelado repetido arriba en el hero;
 * las dos se fusionaron acá). El estado inicial ya viene parseado
 * (`DEMO_EXAMPLES[0]`, calculado en el primer render), así que se lee
 * incluso antes de que el JavaScript termine de hidratar.
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
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg border border-transparent px-3 py-2.5 text-base whitespace-pre-wrap text-foreground"
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
          {/*
            Textarea, no Input (bloque "el resaltado se rompe en teléfono"):
            el overlay de arriba envuelve (`whitespace-pre-wrap`) porque una
            frase de la demo puede ser más larga que el ancho del campo — un
            `<input>` de una sola línea scrollea horizontalmente en vez de
            envolver, así que el resaltado y el texto real se desalineaban en
            pantallas angostas. `field-sizing-content` (clase base de
            `Textarea`, mismo mecanismo que ya usa el resto de la app —
            `task-quick-add-row`, `comment-composer`) hace crecer el campo
            solo, sin JS. `rows={1}` es el alto de arranque; el `onKeyDown`
            evita el salto de línea porque acá no hay nada que enviar y una
            tarea real es una sola línea.
          */}
          <Textarea
            id="parser-demo-input"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              trackInteractionOnce();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            rows={1}
            placeholder="Ej.: reunión con Ana el martes a las 15 p2 #trabajo"
            className="min-h-11 w-full resize-none caret-foreground px-3 py-2.5 text-base text-transparent selection:bg-transparent"
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
