"use client";

import { useMemo } from "react";
import { visibleDaysForFormat } from "@/lib/calendar/layout";
import type { CalendarBlock, CalendarFormat } from "@/lib/calendar/block";
import { AllDayRow } from "./all-day-row";
import { MonthGrid } from "./month-grid";
import { TimeGrid } from "./time-grid";

/**
 * Vista de calendario (grupo 5, D-E y D-F de `design.md`): recibe bloques
 * ya armados por cada dominio (tarea, hábito, evento) en la forma común de
 * `CalendarBlock` y los dibuja en el formato pedido. No conoce mutaciones
 * ni arrastre —eso es el grupo 6, que se suma encima sin rehacer esta
 * grilla— y no decide qué formato mostrar ni dónde persistirlo —eso es la
 * barra de opciones del grupo 7, que controla `format` desde afuera.
 *
 * Los cuatro formatos existen siempre (D-E): esto no oculta ninguno según
 * el ancho, solo cambia cómo se dibuja el elegido.
 *
 * `now` es obligatorio, sin default propio: un `new Date()` evaluado acá
 * adentro tomaría un valor distinto en el render de servidor y en la
 * hidratación del cliente (la línea de la hora actual depende de un
 * instante continuo), así que quien monta la pantalla es quien resuelve
 * ese reloj una sola vez, después de montar — mismo principio que
 * `lib/dates/today.ts` ("ahora" viaja explícito, nunca implícito).
 */
export function CalendarView({
  format,
  anchorDate,
  timezone,
  weekStartsOn,
  blocks,
  previewBlocks = [],
  now,
  timeFormat = 24,
  onSelectBlock,
}: {
  format: CalendarFormat;
  /** Día ancla en `yyyy-MM-dd`: el día mostrado (formato "dia"), el primero de la ventana (formato "cuatro-dias"), o cualquier día dentro de la semana/mes mostrado. */
  anchorDate: string;
  timezone: string;
  weekStartsOn: 0 | 1 | 6;
  blocks: CalendarBlock[];
  /** Vista previa de repeticiones futuras (tarea 5.7): siempre no interactivos, sin importar lo que traigan. */
  previewBlocks?: CalendarBlock[];
  now: Date;
  timeFormat?: 12 | 24;
  onSelectBlock?: (block: CalendarBlock) => void;
}) {
  const visibleDays = useMemo(() => visibleDaysForFormat(format, anchorDate, weekStartsOn), [format, anchorDate, weekStartsOn]);

  if (format === "mes") {
    return (
      <MonthGrid
        visibleDays={visibleDays}
        anchorDate={anchorDate}
        blocks={blocks}
        previewBlocks={previewBlocks}
        timezone={timezone}
        weekStartsOn={weekStartsOn}
        now={now}
        onSelectBlock={onSelectBlock}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border">
      <AllDayRow visibleDays={visibleDays} blocks={blocks} previewBlocks={previewBlocks} onSelectBlock={onSelectBlock} />
      <TimeGrid
        visibleDays={visibleDays}
        blocks={blocks}
        previewBlocks={previewBlocks}
        timezone={timezone}
        now={now}
        timeFormat={timeFormat}
        onSelectBlock={onSelectBlock}
      />
    </div>
  );
}
