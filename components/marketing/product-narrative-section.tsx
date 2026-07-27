import Image from "next/image";

/**
 * "Y después de escribirla" (bloque 12.5, rediseño "El editor"): todo lo que
 * no es el parser, en una sola narrativa en vez de una grilla — la tarea
 * cae en la Bandeja, aparece en Hoy, vive en un proyecto con secciones, se
 * parte en subtareas, y está igual en todos lados. Una sola captura, la de
 * sincronización, porque es el único punto de la narrativa que un recorte
 * de interfaz explica mejor que una frase.
 */
export function ProductNarrativeSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="narrative-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="narrative-heading" className="text-landing-section font-semibold text-foreground">
          Y después de escribirla
        </h2>
        <p className="mt-4 text-lg text-text-secondary">
          Si no le pusiste nada más, la tarea cae en la Bandeja de entrada. Si tiene fecha, aparece
          en Hoy apenas llega el día. Si la mandaste a un proyecto, vive ahí, ordenada en sus
          secciones. Si es grande, la partís en subtareas sin salir de la tarea. Y da igual desde
          dónde la mires: abrís en la compu o en el teléfono y es exactamente la misma.
        </p>
        <div className="mt-8 overflow-hidden rounded-xl border border-border">
          <Image
            src="/landing/sync.webp"
            alt="La misma tarea recién completada, sincronizada al instante entre la computadora y el teléfono"
            width={3484}
            height={458}
            loading="lazy"
            sizes="(min-width: 640px) 42rem, 100vw"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
