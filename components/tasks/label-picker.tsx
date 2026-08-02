"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { ChevronsUpDown } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { useLabels } from "@/lib/labels/use-labels";
import { useReplaceTaskLabels } from "@/lib/tasks/mutations";
import type { LabelChip } from "@/lib/tasks/use-tasks";
import { resolveProjectColorHex } from "@/lib/validation/colors";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";

/**
 * Etiquetas del detalle de tarea (bloque 4.4, requirement "El selector de
 * etiquetas de una tarea permite buscar y elegir varias a la vez"): mismo
 * patrón de `Popover` + `Command` que `components/primitives/select-field.tsx`,
 * pero de selección múltiple — el popover no se cierra al elegir un ítem.
 * La creación de etiquetas es explícita desde `/etiquetas`
 * (`administracion-de-etiquetas`) o implícita al escribir `@nombre` en el
 * alta rápida; acá solo se asignan o quitan las que ya existen. Cada click
 * alterna esa etiqueta en el conjunto local y dispara
 * `replaceLabels.mutate` con el conjunto completo ya actualizado — nunca
 * alta/baja incremental contra el servidor, como pide el requirement.
 *
 * Modo borrador (`onChange`, sin `taskId`): el alta de una tarea (bloque
 * `alta-de-tareas-en-contexto`, D-E) lo usa antes de que la tarea exista —
 * mutar contra un `taskId` real ahí crearía la tarea con solo tocar el
 * selector, violando "cancelar no crea nada". Con `onChange`, `toggle`
 * informa el conjunto elegido a quien llama en vez de mutar; el alta lo
 * persiste junto con el resto de los atributos al confirmar.
 */
export function LabelPicker({
  taskId,
  projectId,
  assigned,
  disabled,
  onChange,
  triggerClassName,
}: {
  taskId?: string;
  projectId: string;
  assigned: LabelChip[];
  disabled?: boolean;
  onChange?: (labels: LabelChip[]) => void;
  triggerClassName?: string;
}) {
  const { data: labels } = useLabels();
  const replaceLabels = useReplaceTaskLabels();
  const { resolvedTheme } = useTheme();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  // Hasta montar, forzar "light" (lo mismo que asume el servidor):
  // `resolvedTheme` se resuelve en el cliente desde el primer render, antes
  // de montar, y puede no coincidir con el servidor.
  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const assignedIds = new Set(assigned.map((l) => l.id));

  function toggle(label: LabelChip) {
    const next = assignedIds.has(label.id) ? assigned.filter((l) => l.id !== label.id) : [...assigned, label];
    if (onChange) {
      onChange(next);
      return;
    }
    if (taskId) replaceLabels.mutate({ taskId, projectId, labels: next });
  }

  if (!labels || labels.length === 0) {
    return (
      <p className="text-sm text-text-secondary">
        Todavía no tenés etiquetas. Se crean solas al escribir <span className="font-mono">@nombre</span> en el
        alta rápida, o desde la pantalla de etiquetas.
      </p>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
      <PopoverTrigger
        disabled={disabled}
        aria-label="Etiquetas de la tarea"
        className={cn(
          "flex h-9 w-full max-w-sm items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
          triggerClassName,
        )}
      >
        {assigned.length === 0 ? (
          <span className="text-text-secondary">Sin etiquetas</span>
        ) : (
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-1">
            {assigned.map((label) => (
              <span
                key={label.id}
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium text-white"
                style={{ backgroundColor: resolveProjectColorHex(label.color, theme) }}
              >
                {label.name}
              </span>
            ))}
          </span>
        )}
        <ChevronsUpDown className="size-4 shrink-0 text-text-secondary" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Buscar etiqueta…" aria-label="Buscar etiqueta" />
          <CommandList>
            <CommandEmpty>No encontramos ninguna etiqueta.</CommandEmpty>
            <CommandGroup>
              {labels.map((label) => {
                const isAssigned = assignedIds.has(label.id);
                return (
                  <CommandItem
                    key={label.id}
                    value={label.name}
                    data-checked={isAssigned}
                    onSelect={() => toggle(label)}
                  >
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: resolveProjectColorHex(label.color, theme) }}
                    />
                    {label.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
