"use client";

import type { MouseEvent } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useListCursor } from "@/components/list-cursor/list-cursor-context";
import { useSelection } from "./selection-context";

/**
 * Casillero de selección de una fila de tarea (bloque 7.10/7.11, capacidad
 * `seleccion-multiple`): independiente del casillero de completar
 * (requirement "cada tarea de la lista muestra... un casillero de selección
 * independiente del casillero de completar"). Visible siempre que el modo
 * está activo; si no, solo al pasar el cursor (mismo tratamiento que el
 * resto de los controles secundarios de la fila — ver `opacity-0
 * group-hover:opacity-100` de `TaskRow`).
 *
 * `⇧clic` selecciona el rango contra el último clic simple, en el orden
 * visual que le pasa el que lo monta (`orderedIds` — bloque 7.10, requirement
 * "Selección de rango con Shift+clic"). Sin `<SelectionProvider>` de por
 * medio no se renderiza nada: `TaskRow` lo monta también dentro del detalle
 * de tarea (subtareas), donde no hay selección múltiple.
 */
export function SelectionCheckbox({ taskId, taskTitle, orderedIds }: { taskId: string; taskTitle: string; orderedIds: string[] }) {
  const selection = useSelection();
  // Roving tabindex (`cursor-de-lista`, D-A): con el cursor cableado, la
  // fila entera es el único tab-stop — este casillero sigue siendo
  // clickeable, pero deja de ser un tab-stop propio (`X` ya lo cubre desde
  // el teclado, bloque 5.1).
  const cursor = useListCursor();
  if (!selection) return null;

  const checked = selection.isSelected(taskId);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (event.shiftKey) selection!.rangeSelect(taskId, orderedIds);
    else selection!.toggle(taskId);
  }

  return (
    <button
      type="button"
      role="checkbox"
      tabIndex={cursor ? -1 : undefined}
      aria-checked={checked}
      aria-label={checked ? `Quitar ${taskTitle} de la selección` : `Seleccionar ${taskTitle}`}
      onClick={handleClick}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        checked ? "border-primary bg-primary" : "border-input",
        !selection.active && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
      )}
    >
      {checked && <Check className="size-3 text-primary-foreground" aria-hidden />}
    </button>
  );
}
