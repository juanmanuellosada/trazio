import { CtaLink } from "./cta-link";

/**
 * CTA fijo de móvil (D-STICKY en `design.md`): `docs/landing.md` lo pedía
 * desde antes y nunca se implementó. `position: fixed` + `sm:hidden` +
 * `env(safe-area-inset-bottom)` (para no quedar tapado por la barra del
 * sistema en iOS) — cero JavaScript.
 *
 * No compite por espacio en el flujo del documento, pero sí se solapa
 * *visualmente* con el CTA del hero apenas arranca el scroll (bug real: los
 * dos quedaban a centímetros de distancia, con el mismo texto, y de paso la
 * barra tapaba "Gratis. Sin tarjeta." al pasar por su misma franja de
 * pantalla). En vez de resolverlo acá con una animación guiada por scroll
 * que oculte esta barra hasta que el CTA del hero salga de pantalla
 * (`timeline-scope` no tiene soporte confiable fuera de Chromium — justo en
 * los navegadores de teléfono que más importan acá), el bloque entero del
 * CTA del hero (botón + leyenda) se oculta en `<sm:` (`hero-section.tsx`,
 * `hidden sm:flex`). Nunca hay dos CTA en pantalla a la vez, nada tapa a
 * "Gratis. Sin tarjeta." porque no está en el DOM en teléfono, y esta barra
 * sigue sin JavaScript ni detección de scroll (G1: la landing sigue siendo
 * enteramente servidor).
 *
 * `MarketingLayout` reserva espacio equivalente a la altura de esta barra
 * en el padding inferior del `<main>` en viewports de teléfono, para que no
 * tape el pie de página ni el CTA del cierre al llegar al final del scroll.
 */
export function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:hidden">
      <CtaLink size="lg" location="fijo" className="w-full" />
    </div>
  );
}
