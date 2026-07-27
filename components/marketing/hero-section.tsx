import { CtaLink } from "./cta-link";
import { HeroParserPreview } from "./hero-parser-preview";

/**
 * Hero (bloque 12.1, rediseño "El editor"): sin captura de producto. El
 * elemento visual principal es el campo del parser congelado
 * (`HeroParserPreview`), no una imagen — el LCP pasa a ser texto. Titular en
 * la escala exclusiva de la landing (`text-landing-hero`,
 * `docs/design-system.md` §4.1): 4x-5x el cuerpo, contra los 2.5x de la
 * versión anterior. Fondo con una malla en el azul de marca, hecha en CSS
 * puro (`.landing-hero-mesh`) — nada de imágenes de fondo.
 */
export function HeroSection() {
  return (
    <section className="landing-hero-mesh px-4 pt-10 pb-14 sm:px-6 sm:pt-16 sm:pb-20">
      <div className="mx-auto max-w-3xl space-y-8 text-center">
        <div className="space-y-5">
          <h1 className="text-landing-hero font-bold text-balance text-foreground">
            Tu gestor de tareas personal, para el día entero.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-text-secondary">
            Escribí lo que tenés que hacer como se lo dirías a alguien. Trazio entiende la fecha, la
            hora y la prioridad solo, y todo queda junto en una sola pantalla.
          </p>
        </div>
        <HeroParserPreview />
        <div className="flex flex-col items-center gap-2">
          <CtaLink size="lg" />
          <p className="text-sm text-text-secondary">Gratis. Sin tarjeta.</p>
        </div>
      </div>
    </section>
  );
}
