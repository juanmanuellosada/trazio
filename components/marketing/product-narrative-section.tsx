import { TOKEN_DOT_CLASS } from "@/lib/landing/token-visuals";
import { cn } from "@/lib/utils";

type JourneyStep = { description: string; chip: string };

/** El recorrido de una tarea después de escrita (bloque 12.5): condición → destino, con el destino como chip. */
const JOURNEY_STEPS: JourneyStep[] = [
  { description: "Si no le pusiste nada más, la tarea cae acá.", chip: "Bandeja de entrada" },
  { description: "Si tiene fecha, aparece acá apenas llega el día.", chip: "Hoy" },
  { description: "Si la mandaste a un proyecto, vive ahí, ordenada en sus secciones.", chip: "Proyecto" },
  { description: "Si es grande, se parte sin salir de la tarea.", chip: "Subtareas" },
  { description: "Y es exactamente la misma en los dos.", chip: "Compu y teléfono" },
];

/**
 * "Y después de escribirla" (bloque 12.5, rediseño "El editor"): todo lo que
 * no es el parser, en dos recursos de puro texto y CSS en vez de una grilla
 * o una captura de pantalla.
 *
 * 1. El recorrido de una tarea (`JOURNEY_STEPS`): condición → destino, con
 *    el destino como chip, mismo lenguaje visual que `ParseResultChips`.
 * 2. Cómo se organiza el trabajo: un árbol real de HTML anidado
 *    (`<ul>`/`<li>`) que muestra la Bandeja de entrada, un proyecto con sus
 *    secciones, un proyecto anidado hasta el tercer nivel y una tarea con
 *    subtareas sin límite de profundidad — la indentación y las líneas de
 *    `border-l` son el recurso gráfico, coherente con que el resaltado de
 *    tokens ya es el sistema gráfico del resto de la página. El punto
 *    "proyecto" reutiliza el mismo color que `@Proyecto` en el parser
 *    (`TOKEN_DOT_CLASS.project`): es el mismo concepto en los dos lados.
 */
export function ProductNarrativeSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="narrative-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="narrative-heading" className="text-landing-section font-semibold text-foreground">
          Y después de escribirla
        </h2>
        <p className="mt-4 text-lg text-text-secondary">Todo lo que no es el parser, en un recorrido.</p>
      </div>

      <ol className="mx-auto mt-8 max-w-2xl space-y-5 border-l border-border pl-4 text-left">
        {JOURNEY_STEPS.map((step) => (
          <li key={step.chip}>
            <p className="text-sm text-text-secondary">{step.description}</p>
            <span className="mt-1.5 inline-flex items-center rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground">
              {step.chip}
            </span>
          </li>
        ))}
      </ol>

      <div className="mx-auto mt-10 max-w-2xl text-left">
        <h3 className="text-base font-semibold text-foreground">Así se organiza</h3>
        <p className="mt-1.5 text-sm text-text-secondary">
          Los proyectos tienen secciones y se anidan hasta tres niveles. Una tarea grande se parte en
          subtareas, sin límite.
        </p>
        <div className="landing-reveal mt-4 rounded-xl border border-border bg-surface p-5 text-sm sm:p-6">
          <ul className="space-y-2">
            <li className="text-foreground">Bandeja de entrada</li>
            <li>
              <p className="flex items-start gap-1.5 text-foreground">
                <span className={cn("mt-1 size-2 shrink-0 rounded-full", TOKEN_DOT_CLASS.project)} aria-hidden />
                Trabajo <span className="text-text-secondary">· proyecto</span>
              </p>
              <ul className="mt-2 space-y-2 border-l border-border pl-3">
                <li>
                  <p className="flex items-start gap-1.5 text-foreground">
                    <span className={cn("mt-1 size-2 shrink-0 rounded-full", TOKEN_DOT_CLASS.project)} aria-hidden />
                    Cliente Acme <span className="text-text-secondary">· proyecto anidado</span>
                  </p>
                  <ul className="mt-2 space-y-2 border-l border-border pl-3">
                    <li className="flex items-start gap-1.5 text-foreground">
                      <span className={cn("mt-1 size-2 shrink-0 rounded-full", TOKEN_DOT_CLASS.project)} aria-hidden />
                      Rediseño web <span className="text-text-secondary">· tercer nivel</span>
                    </li>
                  </ul>
                </li>
                <li>
                  <p className="text-foreground">
                    Sprint actual <span className="text-text-secondary">· sección</span>
                  </p>
                  <ul className="mt-2 space-y-2 border-l border-border pl-3">
                    <li>
                      <p className="text-foreground">
                        Escribir propuesta <span className="text-text-secondary">· tarea</span>
                      </p>
                      <ul className="mt-2 space-y-2 border-l border-border pl-3">
                        <li>
                          <p className="text-foreground">
                            Investigar competencia <span className="text-text-secondary">· subtarea</span>
                          </p>
                          <ul className="mt-2 space-y-2 border-l border-border pl-3">
                            <li className="text-foreground">
                              Armar lista de referencias{" "}
                              <span className="text-text-secondary">· subtarea, sin límite de niveles</span>
                            </li>
                          </ul>
                        </li>
                        <li className="text-foreground">
                          Redactar borrador <span className="text-text-secondary">· subtarea</span>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
