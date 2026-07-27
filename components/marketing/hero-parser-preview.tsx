import { HERO_PARSE_RESULT, HERO_TEXT } from "@/lib/landing/static-parses";
import { ParseResultChips } from "./parse-result-chips";
import { TokenHighlightedText } from "./token-highlighted-text";

/**
 * El elemento visual principal del hero (bloque 12.1): el mismo campo que la
 * demo interactiva de la sección siguiente, pero congelado y sin JavaScript
 * — Server Component puro. Es lo que reemplaza a la captura de pantalla:
 * cero imágenes, el LCP es este texto. El cursor parpadeante es decorativo
 * (`aria-hidden`) y se apaga con `prefers-reduced-motion` (`.landing-caret`
 * en `app/globals.css`).
 */
export function HeroParserPreview() {
  return (
    <div className="mx-auto w-full max-w-2xl text-left">
      <div className="rounded-xl border border-border bg-background/80 px-4 py-3.5 text-base sm:text-lg">
        <TokenHighlightedText text={HERO_TEXT} matches={HERO_PARSE_RESULT.matches} />
        <span aria-hidden className="landing-caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.15em] bg-foreground" />
      </div>
      <div className="mt-3 rounded-xl border border-border bg-surface p-4">
        <ParseResultChips result={HERO_PARSE_RESULT} />
      </div>
    </div>
  );
}
