"use client";

import { useEffect, useRef } from "react";
import { es } from "date-fns/locale";
import { format, parseISO } from "date-fns";
import { currentTimeMinutes, layoutTimedBlocksForDay } from "@/lib/calendar/layout";
import { todayInTimeZone } from "@/lib/dates/today";
import type { CalendarBlock } from "@/lib/calendar/block";
import { cn } from "@/lib/utils";
import { CalendarBlockChip } from "./calendar-block-chip";
import { dayColumnsTemplate, GRID_HEIGHT_PX, GUTTER_WIDTH_PX, HEADER_ROW_HEIGHT_PX, HOUR_ROW_HEIGHT_PX } from "./grid-metrics";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function formatHourLabel(hour: number, timeFormat: 12 | 24): string {
  if (timeFormat === 24) return `${String(hour).padStart(2, "0")}:00`;
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelveHour} ${hour < 12 ? "a. m." : "p. m."}`;
}

/**
 * Grilla de 24 horas (tarea 5.1): un `display: grid` con la columna de
 * horas y una columna por día visible, mismo `grid-template-columns` que
 * `all-day-row.tsx` (`grid-metrics.ts`). Encabezados y columna de horas
 * quedan `sticky` dentro del único contenedor con scroll, así no hace
 * falta sincronizar el scroll de dos elementos a mano.
 *
 * `now` es obligatorio y sin default propio (mismo principio que
 * `lib/dates/today.ts`: "ahora" viaja explícito, nunca `new Date()`
 * implícito): la posición de la línea de la hora actual depende de un
 * valor continuo, así que un default evaluado en el módulo produciría un
 * valor distinto en el render de servidor y en la hidratación del cliente
 * — quien monta la pantalla es quien tiene que resolver ese reloj una sola
 * vez (por ejemplo, recién después de montar, como `hooks/use-media-query.ts`).
 */
export function TimeGrid({
  visibleDays,
  blocks,
  previewBlocks = [],
  timezone,
  now,
  timeFormat = 24,
  onSelectBlock,
}: {
  visibleDays: string[];
  blocks: CalendarBlock[];
  previewBlocks?: CalendarBlock[];
  timezone: string;
  now: Date;
  timeFormat?: 12 | 24;
  onSelectBlock?: (block: CalendarBlock) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = todayInTimeZone(now, timezone);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const minutesNow = currentTimeMinutes(now, visibleDays[0] ?? today, timezone);
    const targetMinutes = Math.max((minutesNow ?? 7 * 60) - 120, 0);
    container.scrollTop = HEADER_ROW_HEIGHT_PX + (targetMinutes / (24 * 60)) * GRID_HEIGHT_PX;
    // Solo al montar: no queremos pelear con el scroll manual del usuario en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
      <div className="grid" style={{ gridTemplateColumns: dayColumnsTemplate(visibleDays.length) }}>
        <div
          className="sticky top-0 left-0 z-30 border-r border-b border-border bg-background"
          style={{ gridColumn: 1, gridRow: 1, width: GUTTER_WIDTH_PX, height: HEADER_ROW_HEIGHT_PX }}
        />

        {visibleDays.map((dateKey, index) => {
          const isToday = dateKey === today;
          return (
            <div
              key={`header-${dateKey}`}
              className={cn(
                "sticky top-0 z-20 flex items-center justify-center border-b border-border bg-background px-1 text-xs capitalize",
                isToday ? "font-semibold text-primary" : "text-muted-foreground",
              )}
              style={{ gridColumn: index + 2, gridRow: 1, height: HEADER_ROW_HEIGHT_PX }}
            >
              {format(parseISO(dateKey), "EEE d", { locale: es })}
            </div>
          );
        })}

        <div
          className="sticky left-0 z-10 border-r border-border bg-background text-right text-[0.7rem] text-muted-foreground"
          style={{ gridColumn: 1, gridRow: 2, width: GUTTER_WIDTH_PX, height: GRID_HEIGHT_PX }}
        >
          {HOURS.map((hour) => (
            <div key={hour} className="-translate-y-2 pr-2" style={{ height: HOUR_ROW_HEIGHT_PX }}>
              {formatHourLabel(hour, timeFormat)}
            </div>
          ))}
        </div>

        {visibleDays.map((dateKey, index) => {
          const merged = blocks.concat(previewBlocks.map((block) => ({ ...block, isPreview: true })));
          const positioned = layoutTimedBlocksForDay(merged, dateKey, timezone);
          const nowMinutes = currentTimeMinutes(now, dateKey, timezone);

          return (
            <div
              key={`day-${dateKey}`}
              className="relative border-r border-border"
              style={{
                gridColumn: index + 2,
                gridRow: 2,
                height: GRID_HEIGHT_PX,
                backgroundImage: "repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent 100%)",
                backgroundSize: `100% ${HOUR_ROW_HEIGHT_PX}px`,
              }}
            >
              {positioned.map((segment) => (
                <div
                  key={`${segment.block.id}-${segment.dateKey}`}
                  className="absolute px-px py-px"
                  style={{
                    top: `${(segment.startMinutes / (24 * 60)) * 100}%`,
                    height: `${((segment.endMinutes - segment.startMinutes) / (24 * 60)) * 100}%`,
                    left: `${(segment.columnIndex / segment.columnCount) * 100}%`,
                    width: `${100 / segment.columnCount}%`,
                  }}
                >
                  <CalendarBlockChip block={segment.block} variant="timed" onSelect={onSelectBlock} className="h-full" />
                </div>
              ))}

              {nowMinutes !== null && (
                <div className="pointer-events-none absolute right-0 left-0 z-10" style={{ top: `${(nowMinutes / (24 * 60)) * 100}%` }}>
                  <div className="absolute top-1/2 left-0 size-2 -translate-y-1/2 rounded-full bg-primary" />
                  <div className="border-t-2 border-primary" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
