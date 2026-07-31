"use client";

import { eachDayOfInterval, endOfWeek, format, parseISO, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { blocksForDay } from "@/lib/calendar/layout";
import { todayInTimeZone } from "@/lib/dates/today";
import type { CalendarBlock } from "@/lib/calendar/block";
import { cn } from "@/lib/utils";
import { CalendarBlockChip } from "./calendar-block-chip";

const MAX_BLOCKS_PER_DAY = 3;

function weekdayLabels(weekStartsOn: 0 | 1 | 6): string[] {
  const reference = startOfWeek(new Date(2026, 0, 1), { weekStartsOn });
  return eachDayOfInterval({ start: reference, end: endOfWeek(reference, { weekStartsOn }) }).map((day) => format(day, "EEE", { locale: es }));
}

/**
 * Formato mes (tarea 5.2): sin grilla horaria propia — un evento de una
 * hora no necesita mostrar su minuto exacto en una celda de mes, alcanza
 * con listarlo entre los del día (`blocksForDay`, todo el día primero,
 * después por hora). El overflow de un día ocupado se corta en un "+N
 * más" en vez de estirar la fila.
 */
export function MonthGrid({
  visibleDays,
  anchorDate,
  blocks,
  previewBlocks = [],
  timezone,
  weekStartsOn,
  now,
  onSelectBlock,
}: {
  visibleDays: string[];
  anchorDate: string;
  blocks: CalendarBlock[];
  previewBlocks?: CalendarBlock[];
  timezone: string;
  weekStartsOn: 0 | 1 | 6;
  /** Sin default propio (ver el comentario del mismo campo en `time-grid.tsx`): "ahora" viaja explícito. */
  now: Date;
  onSelectBlock?: (block: CalendarBlock) => void;
}) {
  const anchorMonth = parseISO(anchorDate).getMonth();
  const today = todayInTimeZone(now, timezone);
  const merged = blocks.concat(previewBlocks.map((block) => ({ ...block, isPreview: true })));

  return (
    <div className="grid grid-cols-7 border-t border-l border-border">
      {weekdayLabels(weekStartsOn).map((label, index) => (
        <div key={`${label}-${index}`} className="border-r border-b border-border bg-surface px-2 py-1 text-center text-xs font-medium text-muted-foreground capitalize">
          {label}
        </div>
      ))}

      {visibleDays.map((dateKey) => {
        const dayBlocks = blocksForDay(merged, dateKey, timezone);
        const isOtherMonth = parseISO(dateKey).getMonth() !== anchorMonth;
        const isToday = dateKey === today;

        return (
          <div
            key={dateKey}
            className={cn("min-h-24 border-r border-b border-border p-1", isOtherMonth && "bg-surface/60 text-muted-foreground")}
          >
            <div className={cn("text-xs", isToday ? "font-semibold text-primary" : "font-medium")}>{format(parseISO(dateKey), "d")}</div>
            <div className="mt-1 flex flex-col gap-0.5">
              {dayBlocks.slice(0, MAX_BLOCKS_PER_DAY).map((block) => (
                <CalendarBlockChip key={block.id} block={block} variant="compact" onSelect={onSelectBlock} />
              ))}
              {dayBlocks.length > MAX_BLOCKS_PER_DAY && (
                <span className="px-1 text-[0.65rem] text-muted-foreground">+{dayBlocks.length - MAX_BLOCKS_PER_DAY} más</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

