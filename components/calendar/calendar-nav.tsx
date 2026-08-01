"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CalendarFormat } from "@/lib/calendar/block";
import { calendarRangeLabel, shiftAnchorDate } from "@/lib/calendar/navigation";
import { todayInTimeZone } from "@/lib/dates/today";

/**
 * Navegación del calendario (grupo 7, "montar `CalendarView`"): `CalendarView`
 * (grupo 5) solo dibuja el rango que se le pasa, nunca decide cuál mostrar —
 * esto es lo que faltaba para poder moverse de un día/semana/mes al
 * siguiente o volver a hoy, con la unidad de paso del formato activo
 * (`lib/calendar/navigation.ts`).
 */
export function CalendarNav({
  format,
  anchorDate,
  visibleDays,
  timezone,
  now,
  onNavigate,
}: {
  format: CalendarFormat;
  anchorDate: string;
  visibleDays: string[];
  timezone: string;
  now: Date;
  onNavigate: (nextAnchorDate: string) => void;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-foreground">{calendarRangeLabel(format, anchorDate, visibleDays)}</h2>
      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="sm" onClick={() => onNavigate(todayInTimeZone(now, timezone))}>
          Hoy
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Período anterior"
          onClick={() => onNavigate(shiftAnchorDate(format, anchorDate, -1))}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Período siguiente"
          onClick={() => onNavigate(shiftAnchorDate(format, anchorDate, 1))}
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </div>
  );
}
