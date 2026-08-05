"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AppContextMenu, type AppContextMenuEntry } from "@/components/primitives/context-menu";
import { layoutAllDayRow } from "@/lib/calendar/layout";
import type { CalendarBlock } from "@/lib/calendar/block";
import { cn } from "@/lib/utils";
import { CalendarBlockChip } from "./calendar-block-chip";
import { MOVE_BLOCK_DRAG_PREFIX } from "./draggable-timed-block";
import { dayColumnsTemplate, GUTTER_WIDTH_PX } from "./grid-metrics";

const ROW_HEIGHT_PX = 26;

/**
 * Un bloque de todo el día, arrastrable hacia la grilla horaria (tarea
 * 6.4, requirement "una tarea de todo el día pasa a tener hora"): mismo
 * prefijo e igual forma de `data` que `DraggableTimedBlock`, así
 * `CalendarView.handleDragEnd` no necesita distinguir de dónde salió el
 * arrastre — un bloque es un bloque, caiga donde caiga (D-F).
 */
function DraggableAllDayChip({
  block,
  onSelectBlock,
  onToggleComplete,
  contextMenuEntries,
}: {
  block: CalendarBlock;
  onSelectBlock?: (block: CalendarBlock) => void;
  onToggleComplete?: (block: CalendarBlock) => void;
  /** Clic derecho (grupo 7, D-E): sin entradas, no se envuelve en `AppContextMenu`. */
  contextMenuEntries?: AppContextMenuEntry[];
}) {
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${MOVE_BLOCK_DRAG_PREFIX}${block.id}`,
    data: { kind: "move-block" as const, block },
    disabled: block.isPreview,
  });

  const content = (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && "z-20 opacity-60")}
      {...(block.isPreview ? {} : listeners)}
    >
      <CalendarBlockChip
        block={block}
        variant="bar"
        onSelect={onSelectBlock}
        onToggleComplete={onToggleComplete}
        className={cn(!block.isPreview && "touch-none")}
      />
    </div>
  );

  if (block.isPreview || !contextMenuEntries || contextMenuEntries.length === 0) return content;
  return <AppContextMenu items={contextMenuEntries} trigger={content} />;
}

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
  onToggleComplete,
  getContextMenuEntries,
}: {
  visibleDays: string[];
  blocks: CalendarBlock[];
  previewBlocks?: CalendarBlock[];
  onSelectBlock?: (block: CalendarBlock) => void;
  onToggleComplete?: (block: CalendarBlock) => void;
  /** Clic derecho (grupo 7, D-E): resuelto por quien monta la pantalla, según el tipo de bloque (D-F, esta fila no sabe de dominios). */
  getContextMenuEntries?: (block: CalendarBlock) => AppContextMenuEntry[];
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
            <DraggableAllDayChip
              block={block}
              onSelectBlock={onSelectBlock}
              onToggleComplete={onToggleComplete}
              contextMenuEntries={getContextMenuEntries?.(block)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
