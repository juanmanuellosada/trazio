import { GALLERY_EXAMPLES } from "@/lib/landing/static-parses";
import { TOKEN_LABELS } from "@/lib/landing/token-visuals";
import { ParseResultChips } from "./parse-result-chips";
import { TokenHighlightedText } from "./token-highlighted-text";

/**
 * Galería de transformaciones (`landing-para-la-vida-entera`, D-HERO en
 * `design.md`): deja de ser una sección propia y pasa a ser un bloque
 * interno de "Lo que tenés que hacer" (`product-narrative-section.tsx`), sin
 * `<section>` ni encabezado propio — el H2 de esa sección ya cubre el tema.
 * Cada tarjeta es una oración real de `docs/parser-test-cases.md`
 * (`lib/landing/static-parses.ts` trae el número de caso y el resultado
 * calculado con el parser de verdad) y demuestra una sola capacidad — nunca
 * describe, siempre muestra. Estático, en el servidor: cero JavaScript,
 * cero imágenes.
 */
export function TransformationsSection() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {GALLERY_EXAMPLES.map((example) => (
        <li key={example.text} className="landing-reveal rounded-xl border border-border bg-background p-4">
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
  );
}
