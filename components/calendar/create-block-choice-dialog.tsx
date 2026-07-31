"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * "¿Tarea o evento?" al arrastrar sobre espacio vacío de la grilla (tarea
 * 6.7, requirement "NUNCA SHALL crear uno de los dos por defecto sin esa
 * pregunta"): las dos opciones existen siempre, ninguna es la respuesta
 * por defecto, y no se crea nada hasta que se elige una — mismo criterio
 * sin-default-silencioso que ya usa `recurrence-scope-dialog.tsx` para la
 * pregunta de una serie recurrente.
 */
export function CreateBlockChoiceDialog({
  open,
  onOpenChange,
  rangeLabel,
  onChooseTask,
  onChooseEvent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rangeLabel: string;
  onChooseTask: () => void;
  onChooseEvent: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>¿Qué querés crear?</DialogTitle>
          <DialogDescription>{rangeLabel}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button type="button" variant="outline" onClick={onChooseTask}>
            Tarea
          </Button>
          <Button type="button" onClick={onChooseEvent}>
            Evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
