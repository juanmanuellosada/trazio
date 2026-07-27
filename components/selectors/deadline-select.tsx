"use client";

import { useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { FlagTriangleRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { formatTaskDueLabel } from "@/lib/dates/format";
import type { ParserContext } from "@/lib/parser/types";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { cn } from "@/lib/utils";
import { DatePickerBody, type CommittedDate } from "./date-picker-body";

/** El día de un `CommittedDate`, tomando el que haya (`dueDate` o el día de `dueAt` en la zona del usuario): la fecha límite nunca tiene hora, así que solo importa el día. */
function dayOf(result: CommittedDate, timezone: string): string | null {
  if (result.dueDate) return result.dueDate;
  if (result.dueAt) return formatInTimeZone(result.dueAt, timezone, "yyyy-MM-dd");
  return null;
}

/**
 * Selector de fecha límite (bloque 4.6), reutilizado en el detalle de tarea
 * y en el alta: mismo campo de lenguaje natural, accesos rápidos y
 * calendario que `DateSelect`, aplicados sobre `deadline` en vez de
 * `due_date`/`due_at`. Sin hora ni duración — la fecha límite es el tope, no
 * el momento en que se piensa trabajar la tarea, y por eso trae su propio
 * ícono y etiqueta que la distinguen de la fecha de vencimiento cuando las
 * dos conviven en el mismo detalle.
 */
export function DeadlineSelect({
  value,
  onChange,
  preferences,
  disabled,
  ariaLabel = "Fecha límite",
}: {
  /** `yyyy-MM-dd` o `null`. */
  value: string | null;
  onChange: (deadline: string | null) => void;
  preferences: UserPreferences;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ctx: Omit<ParserContext, "ahora"> = {
    zonaHoraria: preferences.timezone,
    semanaEmpiezaEn: preferences.weekStartsOn,
    proyectos: [],
    etiquetas: [],
  };

  function clear() {
    onChange(null);
    setOpen(false);
  }

  const label = value
    ? formatTaskDueLabel(
        { due_date: value, due_at: null },
        { now: new Date(), timezone: preferences.timezone, dateFormat: preferences.dateFormat, timeFormat: preferences.timeFormat },
      )
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
      <PopoverTrigger
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg border border-input px-2.5 text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        <FlagTriangleRight className="size-3.5 text-text-secondary" aria-hidden />
        {label ? `Límite: ${label}` : "Agregar fecha límite"}
      </PopoverTrigger>
      <PopoverContent align="start">
        <DatePickerBody
          inputId="deadline-select-input"
          inputLabel="Escribí la fecha límite"
          placeholder="Ej: mañana, el martes, en 3 días…"
          ctx={ctx}
          selectedDate={value}
          onCommitText={(result) => onChange(dayOf(result, preferences.timezone))}
          onSelectDate={onChange}
        />

        {value && (
          <Button type="button" variant="ghost" size="sm" className="mt-2.5 w-full justify-center text-text-secondary" onClick={clear}>
            <X className="size-3.5" /> Quitar fecha límite
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
