"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { QUERY_COMBINED_EXAMPLE, QUERY_FIELD_REFERENCE, QUERY_OPERATOR_REFERENCE } from "@/lib/query-language/field-reference";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Referencia del lenguaje de consulta (bloque 5.2-5.5 de `filtros-alcanzables`,
 * requirement "La pantalla de filtros explica el lenguaje con ejemplos", D-D
 * de design.md: se toca, no se lee). Un legend fijo de operadores (`&`, `|`,
 * `!`, `()`) y un ejemplo combinado que los usa a los cuatro, seguidos de un
 * renglón por campo con sus valores posibles en prosa breve y un ejemplo en
 * formato mono: tocar cualquier ejemplo lo inserta en el campo de consulta
 * de arriba (`onPickExample`), y la vista previa del conteo —que ya corre en
 * vivo ahí arriba— muestra al instante cuántas tareas coinciden.
 *
 * Nunca un popover: un `Collapsible` que empuja contenido hacia abajo en vez
 * de superponerse, para que el campo y su vista previa sigan visibles con la
 * referencia abierta (requirement, D-E de `filtros-guardados`/spec delta).
 * Los campos y sus valores salen de `QUERY_FIELD_REFERENCE`
 * (`lib/query-language/field-reference.ts`), la misma fuente que usa
 * `parse.ts` para su error de campo desconocido — nada escrito a mano acá.
 * Los operadores sí están escritos a mano ahí mismo: a diferencia de los
 * campos, son fijos y no hace falta derivarlos de ningún otro lado.
 */
export function QueryLanguageReference({ onPickExample }: { onPickExample: (example: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border border-border">
      <CollapsibleTrigger className="flex h-9 w-full items-center justify-between gap-2 rounded-md px-3 text-sm font-medium text-text-secondary outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
        Campos del lenguaje
        <ChevronDown className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="flex flex-col gap-2.5 border-t border-border p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            {QUERY_OPERATOR_REFERENCE.map((op) => (
              <span key={op.symbol}>
                <span className="font-mono text-foreground">{op.symbol}</span> {op.meaning}
              </span>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="w-fit font-mono"
            onClick={() => onPickExample(QUERY_COMBINED_EXAMPLE)}
          >
            {QUERY_COMBINED_EXAMPLE}
          </Button>
          <ul className="flex flex-col gap-2.5">
            {QUERY_FIELD_REFERENCE.map((entry) => (
              <li key={entry.field} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                <div className="min-w-28 shrink-0">
                  <p className="text-sm font-medium text-foreground">{entry.label}</p>
                  <p className="text-xs text-text-secondary">{entry.values}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="w-fit font-mono"
                  onClick={() => onPickExample(entry.example)}
                >
                  {entry.example}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
