import { CtaLink } from "./cta-link";
import { ParserDemo } from "./parser-demo";

/**
 * Hero (`landing-para-la-vida-entera`): la demo interactiva del parser
 * (`ParserDemo`) es el elemento visual principal desde el primer render —
 * ya no hay un campo congelado arriba (`HeroParserPreview`, borrado) ni una
 * sección aparte más abajo (`ParserDemoSection`, borrada): las dos se
 * fusionan acá. `ParserDemo` sigue siendo la única isla cliente de la
 * landing; su estado inicial ya viene parseado, así que se lee incluso
 * antes de hidratar. Titular en la escala exclusiva de la landing
 * (`text-landing-hero`, `docs/design-system.md` §4.1). Fondo con una malla
 * en el azul de marca, hecha en CSS puro (`.landing-hero-mesh`) — nada de
 * imágenes de fondo.
 */
export function HeroSection() {
  return (
    <section className="landing-hero-mesh px-4 pt-10 pb-14 sm:px-6 sm:pt-16 sm:pb-20">
      <div className="mx-auto max-w-3xl space-y-8 text-center">
        <div className="space-y-5">
          <h1 className="text-landing-hero font-bold text-balance text-foreground">
            Tu día no entra en una lista.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-text-secondary">
            Trazio junta lo que tenés que hacer, lo que querés sostener y lo que ya está agendado. Y te
            dice si entra en las horas que te quedan.
          </p>
        </div>
        <ParserDemo />
        <div className="flex flex-col items-center gap-2">
          <CtaLink size="lg" location="hero" />
          <p className="text-sm text-text-secondary">Gratis. Sin tarjeta.</p>
        </div>
      </div>
    </section>
  );
}
