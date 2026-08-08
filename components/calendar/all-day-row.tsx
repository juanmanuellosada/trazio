"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AppContextMenu, type AppContextMenuEntry } from "@/components/primitives/context-menu";
import { layoutAllDayRow } from "@/lib/calendar/layout";
import type { CalendarBlock } from "@/lib/calendar/block";
import { cn } from "@/lib/utils";
import { CalendarBlockChip } from "./calendar-block-chip";
import { MOVE_BLOCK_DRAG_PREFIX } from "./draggable-timed-block";
import { GUTTER_WIDTH_PX, HEADER_ROW_HEIGHT_PX } from "./grid-metrics";

const ROW_HEIGHT_PX = 26;
/** Siempre la segunda fila de la grilla unificada (tarea 1.3): la primera es el encabezado de días, la tercera la grilla horaria. */
const ALL_DAY_GRID_ROW = 2;

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
        tooltipDisabled={isDragging}
      />
    </div>
  );

  if (block.isPreview || !contextMenuEntries || contextMenuEntries.length === 0) return content;
  return <AppContextMenu items={contextMenuEntries} trigger={content} />;
}

/**
 * Fila de eventos, tareas y hábitos de todo el día (tarea 5.1, requirement
 * "van en una fila separada, arriba"; unificada a la grilla de `time-grid.tsx`
 * en la tarea 1.3): ya no arma su propio `grid-template-columns` — devuelve
 * directamente los elementos de la fila 2 de la grilla única que dibuja
 * `TimeGrid` (un fragmento, sin nodo propio, para que sigan siendo hijos
 * directos de esa grilla), pegados arriba (`position: sticky`, debajo del
 * encabezado) igual que antes quedaban fuera del contenedor con
 * desplazamiento vertical de la grilla horaria.
 *
 * `mountedDays`/`gridColumnStart` reemplazan a `visibleDays` (tarea 4.1,
 * virtualización): `mountedDays` es lo visible más el margen que
 * `TimeGrid` decide montar, y `gridColumnStart` es la columna absoluta de
 * la grilla continua (`grid-metrics.ts`, `TOTAL_CONTINUOUS_DAYS`) donde
 * empieza ese tramo — sin este desplazamiento, la fila de todo el día
 * quedaría siempre pegada a la columna 2 en vez de seguir a las columnas
 * de día que dibuja debajo, que ya no arrancan ahí.
 */
export function AllDayRow({
  mountedDays,
  gridColumnStart,
  blocks,
  previewBlocks = [],
  onSelectBlock,
  onToggleComplete,
  getContextMenuEntries,
}: {
  mountedDays: string[];
  gridColumnStart: number;
  blocks: CalendarBlock[];
  previewBlocks?: CalendarBlock[];
  onSelectBlock?: (block: CalendarBlock) => void;
  onToggleComplete?: (block: CalendarBlock) => void;
  /** Clic derecho (grupo 7, D-E): resuelto por quien monta la pantalla, según el tipo de bloque (D-F, esta fila no sabe de dominios). */
  getContextMenuEntries?: (block: CalendarBlock) => AppContextMenuEntry[];
}) {
  const merged = blocks.filter((block) => block.allDay).concat(previewBlocks.filter((block) => block.allDay).map((block) => ({ ...block, isPreview: true })));
  const positioned = layoutAllDayRow(merged, mountedDays);
  if (positioned.length === 0) return null;

  const rowCount = Math.max(...positioned.map((p) => p.rowCount));

  return (
    <>
      <div
        // `data-gutter-cell` (`time-grid.tsx` corrige el eje horizontal a
        // mano: `position: sticky; left: 0` no funciona en un ítem de CSS
        // Grid de una sola columna cuando la grilla se desplaza de verdad,
        // ver el comentario largo de `TimeGrid`, D55). El eje vertical
        // (`top`) sí es `sticky` de verdad: ese sigue funcionando.
        data-gutter-cell
        className="sticky z-20 border-r border-b border-border bg-background"
        style={{ gridColumn: 1, gridRow: ALL_DAY_GRID_ROW, top: HEADER_ROW_HEIGHT_PX, width: GUTTER_WIDTH_PX, height: rowCount * ROW_HEIGHT_PX }}
        aria-hidden
      />
      <div
        className="sticky z-20 grid border-b border-border bg-background"
        style={{
          gridColumn: `${gridColumnStart} / span ${mountedDays.length}`,
          gridRow: ALL_DAY_GRID_ROW,
          top: HEADER_ROW_HEIGHT_PX,
          gridTemplateColumns: `repeat(${mountedDays.length}, 1fr)`,
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
    </>
  );
}
