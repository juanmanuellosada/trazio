import { TOKEN_DOT_CLASS, TOKEN_MARK_BASE_CLASS, TOKEN_MARK_CLASS } from "@/lib/landing/token-visuals";
import type { ParseMatch } from "@/lib/parser/types";
import { cn } from "@/lib/utils";

type Item = {
  attr: ParseMatch["attr"];
  title: string;
  before: string;
  token: string;
  after?: string;
};

/**
 * Leyenda de sintaxis (bloque 12.3): cada fila sale de un caso real de
 * `docs/parser-test-cases.md` (los números están al lado de cada uno para
 * quien quiera verificarlos), no de frases inventadas. "Fecha relativa" y
 * "Fecha puntual" comparten color porque comparten tipo de token (`date`):
 * el color identifica la categoría, no la fila.
 */
const ITEMS: Item[] = [
  { attr: "date", title: "Fecha relativa", before: "Comprar pan ", token: "mañana" }, // caso 2
  { attr: "date", title: "Fecha puntual", before: "Cumpleaños de Ana ", token: "15 de marzo" }, // caso 12
  { attr: "hour", title: "Hora", before: "Reunión ", token: "a las 3pm" }, // caso 23
  { attr: "duration", title: "Duración", before: "Correr ", token: "1h30m" }, // caso 28
  { attr: "recurrence", title: "Repetición", before: "Gimnasio ", token: "cada lunes" }, // caso 36
  { attr: "priority", title: "Prioridad, de p1 a p4", before: "Llamar al contador ", token: "p1" }, // caso 38
  { attr: "label", title: "Etiqueta", before: "Comprar leche ", token: "#compras" }, // caso 40
  { attr: "project", title: "Proyecto", before: "Terminar informe ", token: "@Trabajo" }, // caso 41
];

export function LegendSection() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16" aria-labelledby="legend-heading">
      <div className="mx-auto max-w-4xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="legend-heading" className="text-landing-section font-semibold text-foreground">
            Lo que entiende
          </h2>
          <p className="mt-2 text-text-secondary">
            Ocho tipos de dato, cada uno con su color. El mismo color de acá es el que ves resaltado
            arriba y en los ejemplos de abajo.
          </p>
        </div>
        <dl className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {ITEMS.map((item) => (
            // El contenido de `<dl>` acepta `<div>` como agrupador, pero sus
            // hijos tienen que ser directamente `dt` seguido de `dd` (regla
            // `definition-list`/`dlitem` de axe) — el punto de color va
            // dentro del `dt`, no como hermano suelto.
            <div key={item.title}>
              <dt className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className={cn("size-2.5 shrink-0 rounded-full", TOKEN_DOT_CLASS[item.attr])} aria-hidden />
                {item.title}
              </dt>
              <dd className="mt-0.5 pl-[1.125rem] text-sm text-text-secondary">
                {item.before}
                <mark className={cn(TOKEN_MARK_BASE_CLASS, TOKEN_MARK_CLASS[item.attr])}>{item.token}</mark>
                {item.after ?? ""}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
