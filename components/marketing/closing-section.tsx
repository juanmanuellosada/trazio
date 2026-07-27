import { CtaLink } from "./cta-link";

/** Cierre (bloque 12.8): mismo CTA del hero, titular corto, nada más. */
export function ClosingSection() {
  return (
    <section className="px-4 py-16 text-center sm:px-6 sm:py-24">
      <div className="mx-auto max-w-xl space-y-6">
        <h2 className="text-landing-section font-semibold text-balance text-foreground">
          Empezá a organizar tu día en dos minutos.
        </h2>
        <div className="flex justify-center">
          <CtaLink size="lg" />
        </div>
      </div>
    </section>
  );
}
