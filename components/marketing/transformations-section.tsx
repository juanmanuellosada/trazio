import { GALLERY_EXAMPLES } from "@/lib/landing/static-parses";
import { TOKEN_LABELS } from "@/lib/landing/token-visuals";
import { ParseResultChips } from "./parse-result-chips";
import { TokenHighlightedText } from "./token-highlighted-text";

/**
 * Galería de transformaciones (bloque 12.4, rediseño "El editor"): reemplaza
 * a la antigua grilla de seis funcionalidades. Cada tarjeta es una oración
 * real de `docs/parser-test-cases.md` (`lib/landing/static-parses.ts` trae
 * el número de caso y el resultado calculado con el parser de verdad) y
 * demuestra una sola capacidad — nunca describe, siempre muestra. Estático,
 * en el servidor: cero JavaScript, cero imágenes.
 */
export function TransformationsSection() {
  return (
    <section className="bg-surface px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="gallery-heading">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="gallery-heading" className="text-landing-section font-semibold text-foreground">
            Una frase, una tarea entera
          </h2>
          <p className="mt-2 text-text-secondary">
            Seis oraciones, seis capacidades distintas. Así queda cada una apenas la escribís.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY_EXAMPLES.map((example) => (
            <li
              key={example.text}
              className="landing-reveal rounded-xl border border-border bg-background p-4"
            >
              <p className="text-xs font-medium text-text-secondary">{TOKEN_LABELS[example.capability]}</p>
              <p className="mt-2 text-base">
                <TokenHighlightedText text={example.text} matches={example.result.matches} />
              </p>
              <div className="mt-4 border-t border-border pt-3">
                <ParseResultChips result={example.result} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
