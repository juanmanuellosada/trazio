"use client";

import { useState } from "react";
import type { RecurrenceEditScope } from "@/lib/calendar/events";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * El diálogo que pregunta a cuáles ocurrencias de una serie recurrente
 * aplica un cambio (tarea 3.6, D-D, requirement "sin default silencioso"):
 * las tres opciones existen siempre, ninguna aparece marcada al abrir, y
 * confirmar sin elegir una no hace nada — el botón de confirmar queda
 * deshabilitado hasta que se elige explícitamente. Cada opción explica en
 * texto a qué ocurrencias afecta, en vez de un número: contar cuántas
 * ocurrencias quedan de una serie sin fin no tiene una respuesta, así que
 * la claridad viene de la descripción, no de una cifra.
 *
 * Reusa `Dialog` (no `AlertDialog`/`ConfirmDialog`): esto no es confirmar
 * una única acción, es elegir entre tres — necesita su propio grupo de
 * opciones, con el mismo patrón `role="radio"` que ya usa
 * `components/tasks/move-task-dialog.tsx`.
 */

const OPTIONS: { value: RecurrenceEditScope; label: string; description: string }[] = [
  {
    value: "this",
    label: "Esta ocurrencia",
    description: "Solo este evento puntual. El resto de la serie sigue como estaba.",
  },
  {
    value: "this-and-following",
    label: "Esta y las siguientes",
    description: "Este evento y todos los que vengan después. Los anteriores no cambian.",
  },
  {
    value: "all",
    label: "Todas",
    description: "Toda la serie, incluidas las ocurrencias pasadas y futuras.",
  },
];

export function RecurrenceScopeDialog({
  open,
  onOpenChange,
  action,
  onConfirm,
  excludeThisOccurrence = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cambia el título y el verbo del botón: "editar" no es destructivo, "eliminar" sí. */
  action: "editar" | "eliminar";
  onConfirm: (scope: RecurrenceEditScope) => void;
  /**
   * Oculta "Esta ocurrencia" (`alta-de-evento-completa`, tarea 3.4): cambiar
   * la regla de repetición con alcance de una sola ocurrencia no significa
   * nada, así que quien edita la propia regla no puede llegar a elegirla.
   */
  excludeThisOccurrence?: boolean;
}) {
  const options = excludeThisOccurrence ? OPTIONS.filter((option) => option.value !== "this") : OPTIONS;
  const [selected, setSelected] = useState<RecurrenceEditScope | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) setSelected(null);
    onOpenChange(next);
  }

  function handleConfirm() {
    if (!selected) return;
    onConfirm(selected);
    handleOpenChange(false);
  }

  const verb = action === "editar" ? "Editar" : "Eliminar";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{verb} evento recurrente</DialogTitle>
          <DialogDescription>Este evento se repite. Elegí a cuáles ocurrencias aplica el cambio.</DialogDescription>
        </DialogHeader>

        <div role="radiogroup" aria-label="Alcance del cambio" className="space-y-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected === option.value}
              onClick={() => setSelected(option.value)}
              className={cn(
                "flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50",
                selected === option.value && "bg-surface",
              )}
            >
              <span className="text-sm font-medium text-foreground">{option.label}</span>
              <span className="text-sm text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant={action === "eliminar" ? "destructive" : "default"} disabled={!selected} onClick={handleConfirm}>
            {verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
