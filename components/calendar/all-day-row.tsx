"use client";

import { layoutAllDayRow } from "@/lib/calendar/layout";
import type { CalendarBlock } from "@/lib/calendar/block";
import { CalendarBlockChip } from "./calendar-block-chip";
import { dayColumnsTemplate, GUTTER_WIDTH_PX } from "./grid-metrics";

const ROW_HEIGHT_PX = 26;

/**
 * Fila de eventos, tareas y hábitos de todo el día (tarea 5.1, requirement
 * "van en una fila separada, arriba"): vive fuera de la grilla horaria de
 * `time-grid.tsx`, comparte con ella el mismo `grid-template-columns`
 * (`grid-metrics.ts`) para que las columnas de los dos queden alineadas.
 */
export function AllDayRow({
  visibleDays,
  blocks,
  previewBlocks = [],
  onSelectBlock,
}: {
  visibleDays: string[];
  blocks: CalendarBlock[];
  previewBlocks?: CalendarBlock[];
  onSelectBlock?: (block: CalendarBlock) => void;
}) {
  const merged = blocks.filter((block) => block.allDay).concat(previewBlocks.filter((block) => block.allDay).map((block) => ({ ...block, isPreview: true })));
  const positioned = layoutAllDayRow(merged, visibleDays);
  if (positioned.length === 0) return null;

  const rowCount = Math.max(...positioned.map((p) => p.rowCount));

  return (
    <div className="grid border-b border-border" style={{ gridTemplateColumns: dayColumnsTemplate(visibleDays.length) }}>
      <div className="border-r border-border" style={{ width: GUTTER_WIDTH_PX, height: rowCount * ROW_HEIGHT_PX }} aria-hidden />
      <div
        className="grid"
        style={{
          gridColumn: `2 / span ${visibleDays.length}`,
          gridTemplateColumns: `repeat(${visibleDays.length}, 1fr)`,
          gridAutoRows: ROW_HEIGHT_PX,
        }}
      >
        {positioned.map(({ block, startIndex, span, rowIndex }) => (
          <div
            key={block.id}
            className="min-w-0 px-0.5 py-0.5"
            style={{ gridColumn: `${startIndex + 1} / span ${span}`, gridRow: rowIndex + 1 }}
          >
            <CalendarBlockChip block={block} variant="bar" onSelect={onSelectBlock} />
          </div>
        ))}
      </div>
    </div>
  );
}
