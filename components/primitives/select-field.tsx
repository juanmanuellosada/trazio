"use client";

import { useState, type ReactNode } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { OVERLAY_MODAL } from "./overlay";

export interface SelectFieldOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/**
 * Selector desplegable propio de Trazio (bloque 2.5): capa de identidad
 * sobre `Popover` + `Command` de shadcn/ui. El trigger es un botón nativo,
 * así que `Enter` y `Espacio` ya lo abren sin código propio; `Command`
 * (`cmdk`) ya resuelve navegar la lista con las flechas y elegir con
 * `Enter`. Nada de eso se reimplementa acá.
 *
 * `timezone-combobox.tsx` ya sigue este mismo patrón pero con un `Popover`
 * sin identidad: no bloquea el scroll de fondo, porque `modal` en
 * `Popover` es `false` por defecto (`overlay.ts`). Esta primitiva es la
 * versión con esa identidad — `modal` explícito — para que un selector
 * desplegable se comporte como cualquier otra capa superpuesta de la app.
 * Sirve de base a los selectores de fecha, prioridad y proyecto de
 * `selectores-de-atributos` (bloque 4) y al selector de color del modal de
 * proyecto (bloque 8).
 */
export function SelectField<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Elegí una opción",
  searchPlaceholder = "Buscar…",
  emptyMessage = "No encontramos ninguna opción.",
  disabled,
  triggerClassName,
  ariaLabel,
}: {
  value: T | null;
  onChange: (value: T) => void;
  options: SelectFieldOption<T>[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  triggerClassName?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
      <PopoverTrigger
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
          triggerClassName,
        )}
      >
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          {selected?.icon}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-text-secondary" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  data-checked={option.value === value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.icon}
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
