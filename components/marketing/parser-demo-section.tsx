import { ParserDemo } from "./parser-demo";

/**
 * Sección diferencial (bloque 12.3): la demo del parser en vivo, sin
 * registrarse. El encabezado queda en el Server Component; solo `ParserDemo`
 * es cliente.
 */
export function ParserDemoSection() {
  return (
    <section className="bg-surface px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="demo-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="demo-heading" className="text-2xl font-semibold text-foreground">
          Escribís como hablás
        </h2>
        <p className="mt-2 text-text-secondary">
          Probalo ahora mismo, sin crear una cuenta. Tocá un ejemplo o escribí el tuyo.
        </p>
      </div>
      <div className="mt-8">
        <ParserDemo />
      </div>
    </section>
  );
}
