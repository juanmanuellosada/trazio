import { CtaLink } from "./cta-link";

/**
 * Repetición intermedia del CTA principal (bloque 12.2/12.4/12.6): mismo
 * botón y mismo texto que el hero y el cierre, sin titular — un titular acá
 * competiría con la sección que viene antes o después. Padding vertical más
 * chico que una sección de contenido (`py-8 sm:py-10` contra `py-12 sm:py-16`)
 * para que se lea como una pausa entre secciones, no como una sección nueva.
 */
export function CtaBand() {
  return (
    <div className="flex justify-center px-4 py-8 sm:px-6 sm:py-10">
      <CtaLink size="lg" />
    </div>
  );
}
