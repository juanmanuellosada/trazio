import { CtaLink } from "./cta-link";

/**
 * CTA fijo de móvil (D-STICKY en `design.md`): `docs/landing.md` lo pedía
 * desde antes y nunca se implementó. `position: fixed` + `sm:hidden` +
 * `env(safe-area-inset-bottom)` (para no quedar tapado por la barra del
 * sistema en iOS) — cero JavaScript, no hace falta detectar scroll ni
 * ocultarse cerca de otro CTA porque, al ser `fixed`, no compite por
 * espacio con el resto de la página (G1: la landing sigue siendo
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
