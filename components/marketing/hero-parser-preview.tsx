import { HERO_PARSE_RESULT, HERO_TEXT } from "@/lib/landing/static-parses";
import { TokenHighlightedText } from "./token-highlighted-text";

/**
 * El elemento visual principal del hero (bloque 12.1): congelado y sin
 * JavaScript — Server Component puro. Es lo que reemplaza a la captura de
 * pantalla: cero imágenes, el LCP es este texto. A diferencia de la demo de
 * la sección siguiente, acá no se muestra el resultado (los chips) — el
 * hero es la invitación (el campo con la frase), la demo es donde se
 * despliega el resultado completo y se puede escribir. Mostrar las dos
 * cosas en el hero duplicaría lo que hace la demo un scroll más abajo. El
 * cursor parpadeante es decorativo (`aria-hidden`) y se apaga con
 * `prefers-reduced-motion` (`.landing-caret` en `app/globals.css`).
 */
export function HeroParserPreview() {
  return (
    <div className="mx-auto w-full max-w-2xl text-left">
      <div className="rounded-xl border border-border bg-background/80 px-4 py-3.5 text-base sm:text-lg">
        <TokenHighlightedText text={HERO_TEXT} matches={HERO_PARSE_RESULT.matches} />
        <span aria-hidden className="landing-caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.15em] bg-foreground" />
      </div>
    </div>
  );
}
