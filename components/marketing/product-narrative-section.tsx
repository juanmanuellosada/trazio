import { TOKEN_DOT_CLASS } from "@/lib/landing/token-visuals";
import { cn } from "@/lib/utils";

/**
 * "Todo se ordena solo" (bloque 12.5, rediseño "El editor"): un solo bloque
 * en vez de dos que se pisaban (un recorrido en pasos y un árbol debajo,
 * repitiendo los mismos conceptos con distinta forma). El árbol es el activo
 * fuerte —muestra la estructura de un vistazo— así que lleva todo el peso:
 * un árbol real de HTML anidado (`<ul>`/`<li>`) con la Bandeja de entrada, un
 * proyecto con sus secciones, un proyecto anidado hasta el tercer nivel y una
 * tarea con subtareas sin límite de profundidad. La indentación y las líneas
 * de `border-l` son el recurso gráfico; el punto de proyecto reutiliza el
 * mismo color que `@Proyecto` en el parser (`TOKEN_DOT_CLASS.project`), ya
 * enseñado en la leyenda y la demo. Sin anotar cada nodo con su tipo — la
 * jerarquía ya se ve en la indentación, y "proyecto", "sección" y "subtarea"
 * quedan dichos una sola vez en el párrafo de arriba. Debajo del árbol, un
 * único renglón cubre lo que el árbol no puede mostrar: cuándo aparece una
 * tarea en Hoy, y que es la misma en la compu y en el teléfono.
 */
export function ProductNarrativeSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="narrative-heading">
      <div className="mx-auto max-w-2xl text-center">
        <h2 id="narrative-heading" className="text-landing-section font-semibold text-foreground">
          Todo se ordena solo
        </h2>
        <p className="mt-4 text-lg text-text-secondary">
          Las tareas se agrupan en proyectos con secciones, anidados hasta tres niveles, y se parten en
          subtareas sin límite.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl">
        <div className="landing-reveal rounded-xl border border-border bg-surface p-5 text-sm sm:p-6">
          <ul className="space-y-2">
            <li className="text-foreground">Bandeja de entrada</li>
            <li>
              <p className="flex items-start gap-1.5 text-foreground">
                <span className={cn("mt-1 size-2 shrink-0 rounded-full", TOKEN_DOT_CLASS.project)} aria-hidden />
                Trabajo
              </p>
              <ul className="mt-2 space-y-2 border-l border-border pl-3">
                <li>
                  <p className="flex items-start gap-1.5 text-foreground">
                    <span className={cn("mt-1 size-2 shrink-0 rounded-full", TOKEN_DOT_CLASS.project)} aria-hidden />
                    Cliente Acme
                  </p>
                  <ul className="mt-2 space-y-2 border-l border-border pl-3">
                    <li className="flex items-start gap-1.5 text-foreground">
                      <span className={cn("mt-1 size-2 shrink-0 rounded-full", TOKEN_DOT_CLASS.project)} aria-hidden />
                      Rediseño web
                    </li>
                  </ul>
                </li>
                <li>
                  <p className="text-foreground">Sprint actual</p>
                  <ul className="mt-2 space-y-2 border-l border-border pl-3">
                    <li>
                      <p className="text-foreground">Escribir propuesta</p>
                      <ul className="mt-2 space-y-2 border-l border-border pl-3">
                        <li>
                          <p className="text-foreground">Investigar competencia</p>
                          <ul className="mt-2 space-y-2 border-l border-border pl-3">
                            <li className="text-foreground">Armar lista de referencias</li>
                          </ul>
                        </li>
                        <li className="text-foreground">Redactar borrador</li>
                      </ul>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </div>
        <p className="mt-4 text-sm text-text-secondary">
          Si le pusiste fecha, aparece en Hoy apenas llega el día. Y es exactamente la misma en la compu
          y en el teléfono.
        </p>
      </div>
    </section>
  );
}
