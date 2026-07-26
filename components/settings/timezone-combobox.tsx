"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

function getTimeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    // Navegadores muy viejos sin `Intl.supportedValuesOf`: la zona ya
    // guardada sigue siendo una opción válida aunque la lista quede corta.
    return ["America/Argentina/Buenos_Aires", "UTC"];
  }
}

/**
 * Selector de zona horaria (tarea 11.4, decisión D8): la lista completa de
 * zonas IANA que devuelve el navegador con `Intl.supportedValuesOf`, no un
 * puñado fijo de 13 — son varios cientos de entradas, así que hace falta
 * poder buscar en vez de desplazarse a mano por una lista larguísima.
 * `cmdk` (detrás de `Command`) filtra en vivo mientras se escribe.
 */
export function TimezoneCombobox({
  value,
  onChange,
  disabled,
  labelId,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  labelId: string;
}) {
  const [open, setOpen] = useState(false);
  const zones = useMemo(() => getTimeZones(), []);
  // `Intl.supportedValuesOf` solo devuelve nombres canónicos: el default de
  // la cuenta (`America/Argentina/Buenos_Aires`, B4) es un alias de IANA
  // que ICU resuelve a `America/Buenos_Aires` y por eso no aparece en esa
  // lista. Sin este agregado, la zona guardada de cualquier cuenta nueva no
  // se podría encontrar buscando ni aparecería marcada como seleccionada.
  const options = useMemo(() => (zones.includes(value) ? zones : [value, ...zones]), [zones, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-labelledby={labelId}
        disabled={disabled}
        className="flex h-9 w-full max-w-sm items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50"
      >
        <span className="truncate">{value.replaceAll("_", " ")}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-text-secondary" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Buscar zona horaria…" aria-label="Buscar zona horaria" />
          <CommandList>
            <CommandEmpty>No encontramos esa zona.</CommandEmpty>
            <CommandGroup>
              {options.map((zone) => (
                <CommandItem
                  key={zone}
                  value={zone}
                  data-checked={zone === value}
                  onSelect={() => {
                    onChange(zone);
                    setOpen(false);
                  }}
                >
                  {zone.replaceAll("_", " ")}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
