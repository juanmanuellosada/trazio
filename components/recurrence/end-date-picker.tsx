"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { OVERLAY_MODAL } from "@/components/primitives/overlay";
import { CalendarGrid } from "@/components/selectors/calendar-grid";

/**
 * Fecha tope de una serie recurrente (`sin-controles-nativos`, tarea 2.2):
 * calendario propio en vez de un `<input type="date">`. Sin lenguaje
 * natural ni accesos rápidos — el spec solo pide "el calendario propio"
 * acá. Compartido entre `RecurrenceEditor` (`components/tasks/`) y
 * `CustomRecurrenceDialog` (`repeticion-configurable`, tarea 4.2): el
 * mismo control de fecha tope, sin duplicarlo.
 */
export function EndDatePicker({
  value,
  onChange,
  disabled,
  weekStartsOn,
}: {
  /** `yyyy-MM-dd`, o `""` recién elegido el modo "En una fecha" sin fecha todavía. */
  value: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  weekStartsOn: 0 | 1 | 6;
}) {
  const [open, setOpen] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  const [month, setMonth] = useState(() => parseISO(value || today));

  const label = value ? format(parseISO(value), "d 'de' MMMM 'de' yyyy", { locale: es }) : "Elegí una fecha";

  return (
    <Popover open={open} onOpenChange={setOpen} modal={OVERLAY_MODAL}>
      <PopoverTrigger
        aria-label="Fecha de fin de la repetición"
        disabled={disabled}
        className="flex h-9 w-40 items-center rounded-lg border border-input px-2.5 text-left text-sm outline-none hover:bg-surface focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
      >
        {label}
      </PopoverTrigger>
      <PopoverContent align="start">
        <CalendarGrid
          month={month}
          onMonthChange={setMonth}
          selectedDate={value || null}
          today={today}
          weekStartsOn={weekStartsOn}
          onSelectDate={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
