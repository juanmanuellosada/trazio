import { TransformationsSection } from "./transformations-section";

/**
 * "Lo que tenés que hacer" (`landing-para-la-vida-entera`, reescritura de
 * "Todo se ordena solo"): sin el árbol de jerarquía HTML anidado que tenía
 * antes — cualquier competidor lo tiene, no es un diferencial (ver
 * `proposal.md`). En su lugar, la galería de transformaciones del parser
 * (`TransformationsSection`, D-HERO en `design.md`) se reubica acá como
 * demostración de la primera frase, sin `<section>` ni encabezado propio, y
 * se suma una galería de ejemplos del lenguaje de consulta —el mismo
 * tratamiento visual, consulta a la izquierda y su significado a la
 * derecha, sintaxis real de `docs/product-spec.md` §7.
 */
const QUERY_EXAMPLES = [
  { query: "priority:1,2 & due:next7days", meaning: "Prioridad urgente o alta, que vence esta semana" },
  { query: "project:Trabajo & !label:espera", meaning: "Todo lo de Trabajo, menos lo que está en espera" },
  { query: "due:overdue", meaning: "Todo lo atrasado" },
] as const;

export function ProductNarrativeSection() {
  return (
    <section className="bg-surface px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="narrative-heading">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="narrative-heading" className="text-landing-section font-semibold text-foreground">
            Lo que tenés que hacer, ordenado como vos quieras
          </h2>
          <p className="mt-4 text-lg text-text-secondary">
            Fecha, hora, duración, prioridad y etiqueta salen solas de lo que escribiste — es lo mismo
            que acabás de ver arriba. Lo demás lo ordenás vos: las tareas se agrupan en proyectos con
            secciones, anidadas hasta tres niveles, y una tarea se parte en subtareas sin límite.
          </p>
        </div>

        <div className="mt-10">
          <TransformationsSection />
        </div>

        <div className="mx-auto mt-14 max-w-2xl text-center">
          <h3 className="text-xl font-semibold text-foreground">
            Y cuando la lista crece, la filtrás igual que escribís una tarea
          </h3>
          <p className="mt-3 text-text-secondary">
            Un filtro se escribe, no se arma clickeando casilleros. Combinás prioridad, fecha, proyecto,
            etiqueta y estado con <code className="font-mono text-foreground">&amp;</code>,{" "}
            <code className="font-mono text-foreground">|</code> y{" "}
            <code className="font-mono text-foreground">!</code>, y lo guardás para volver a usarlo
            cuando quieras.
          </p>
        </div>

        <ul className="mt-8 grid gap-4 sm:grid-cols-3">
          {QUERY_EXAMPLES.map((example) => (
            <li key={example.query} className="rounded-xl border border-border bg-background p-4">
              <code className="block font-mono text-sm break-words text-foreground">{example.query}</code>
              <p className="mt-2 text-sm text-text-secondary">{example.meaning}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
