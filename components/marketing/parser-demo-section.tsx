import { ParserDemo } from "./parser-demo";

/**
 * Sección diferencial (bloque 12.2, rediseño "El editor"): el mismo campo
 * del hero, ahora interactivo. El encabezado queda en el Server Component;
 * solo `ParserDemo` es cliente.
 */
export function ParserDemoSection() {
  return (
    <section className="bg-surface px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="demo-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="demo-heading" className="text-landing-section font-semibold text-foreground">
          Escribís como hablás
        </h2>
        <p className="mt-2 text-text-secondary">
          Es el mismo campo de arriba, ahora tocá vos. Elegí un ejemplo o escribí el tuyo — sin crear
          una cuenta.
        </p>
      </div>
      <div className="mt-8">
        <ParserDemo />
      </div>
    </section>
  );
}
