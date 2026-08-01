"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateEventDialog } from "@/components/calendar/create-event-dialog";
import { useUserPreferences } from "@/components/providers/preferences-provider";
import { defaultEventRange } from "@/lib/calendar/default-event-range";
import { ShortcutHint } from "@/components/shortcuts/shortcut-hint";
import { GENERAL_SHORTCUTS } from "@/lib/shortcuts/general";
import { cn } from "@/lib/utils";

/**
 * Acceso "agregar evento" en el panel lateral (bloque 7.6): el spec lo pide
 * desde la fase 1 y nunca se había implementado — hasta esta fase no existía
 * ningún evento de calendario que agregar. Mismo patrón que
 * `sidebar-add-task.tsx`: un botón que abre el mismo diálogo de alta que ya
 * usan el atajo `E` (`shortcut-provider.tsx`) y "crear arrastrando sobre
 * espacio vacío" (`components/calendar/create-block-choice-dialog.tsx`), sin
 * una segunda implementación acá. El rango de arranque sale de
 * `defaultEventRange`, la misma próxima-media-hora-redonda que usa el atajo.
 */
export function SidebarAddEvent({ collapsed }: { collapsed: boolean }) {
  const { timezone } = useUserPreferences();
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null);

  const trigger = (
    <button
      type="button"
      onClick={() => setRange(defaultEventRange(new Date()))}
      className={cn(
        "flex h-10 items-center gap-2.5 rounded-md px-2.5 text-sm font-medium text-text-secondary outline-none transition-colors hover:bg-surface hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        collapsed && "w-9 justify-center px-0",
      )}
    >
      <CalendarPlus className="size-4 shrink-0" />
      {!collapsed && <span className="flex-1 text-left">Agregar evento</span>}
      {!collapsed && <ShortcutHint combo={GENERAL_SHORTCUTS.agregarEvento} />}
    </button>
  );

  return (
    <>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger render={trigger} />
          <TooltipContent side="right">Agregar evento</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      {range && (
        <CreateEventDialog
          open
          onOpenChange={(open) => !open && setRange(null)}
          start={range.start}
          end={range.end}
          timezone={timezone}
        />
      )}
    </>
  );
}
