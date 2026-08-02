"use client";

import { addMonths, endOfMonth, format, getDay, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAY_HEADERS_FROM_SUNDAY = ["D", "L", "M", "M", "J", "V", "S"];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calendario mensual navegable propio (bloque 4.4): grilla de botones sobre
 * `date-fns`, sin librería de calendario ni `<input type="date">`. Lo
 * comparten el selector de fecha y el de fecha límite (bloque 4.6) a través
 * de `DatePickerBody` — la única diferencia entre los dos es a qué columna
 * termina yendo el día elegido, no cómo se navega o se elige.
 */
export function CalendarGrid({
  month,
  onMonthChange,
  selectedDate,
  today,
  weekStartsOn,
  onSelectDate,
  minDate,
}: {
  /** Cualquier día del mes que se está mostrando. */
  month: Date;
  onMonthChange: (month: Date) => void;
  /** `yyyy-MM-dd` o `null`. */
  selectedDate: string | null;
  /** `yyyy-MM-dd` de hoy, en la zona horaria del usuario. */
  today: string;
  weekStartsOn: 0 | 1 | 6;
  onSelectDate: (date: string) => void;
  /** `yyyy-MM-dd` opcional: los días anteriores se muestran deshabilitados (reprogramar un hábito, que no puede ir a un día anterior a que existiera). Ningún otro consumidor lo necesita. */
  minDate?: string;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const leading = (getDay(monthStart) - weekStartsOn + 7) % 7;
  const days: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= monthEnd.getDate(); day++) {
    days.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
  }
  const weekdayHeaders = Array.from({ length: 7 }, (_, i) => WEEKDAY_HEADERS_FROM_SUNDAY[(weekStartsOn + i) % 7]);

  return (
    <div>
      <div className="flex items-center justify-between px-0.5 pb-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Mes anterior"
          onClick={() => onMonthChange(addMonths(monthStart, -1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium capitalize">{format(monthStart, "MMMM yyyy", { locale: es })}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Mes siguiente"
          onClick={() => onMonthChange(addMonths(monthStart, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 px-0.5 pb-0.5 text-center text-xs text-text-secondary" aria-hidden>
        {weekdayHeaders.map((header, index) => (
          <span key={index}>{header}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 px-0.5">
        {days.map((date, index) => {
          if (!date) return <span key={index} aria-hidden />;
          const key = toDateKey(date);
          const isSelected = key === selectedDate;
          const isToday = key === today;
          const isDisabled = minDate != null && key < minDate;
          return (
            <button
              key={index}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectDate(key)}
              aria-label={format(date, "EEEE d 'de' MMMM", { locale: es })}
              aria-pressed={isSelected}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-sm outline-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 disabled:hover:bg-transparent",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                !isSelected && isToday && "font-semibold text-primary",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
