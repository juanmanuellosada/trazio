"use client";

import { CommandDialog } from "@/components/ui/command";
import { SearchCommand } from "./search-command";

/**
 * Paleta de comandos del buscador (buscador-como-paleta, D-A): lo que abre
 * el atajo `S` (`shortcut-provider.tsx`), por encima de la vista actual —
 * cerrarla (elegir algo, `Escape` o clic afuera) devuelve exactamente a
 * donde se estaba, porque no navega nada por sí misma. Mismo patrón que
 * `GlobalQuickAddDialog`: un diálogo global montado una sola vez, con su
 * `open`/`onOpenChange` controlados desde el propio `ShortcutProvider`.
 */
export function SearchPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buscar"
      description="Buscá una tarea, volvé a una vista reciente o navegá a otra sección."
    >
      <SearchCommand onNavigate={() => onOpenChange(false)} />
    </CommandDialog>
  );
}
