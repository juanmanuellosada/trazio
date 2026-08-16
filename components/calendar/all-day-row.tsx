"use client";

import { useDndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AppContextMenu, type AppContextMenuEntry } from "@/components/primitives/context-menu";
import { layoutAllDayRow } from "@/lib/calendar/layout";
import type { CalendarBlock } from "@/lib/calendar/block";
import { cn } from "@/lib/utils";
import { CalendarBlockChip } from "./calendar-block-chip";
import { MOVE_BLOCK_DRAG_PREFIX } from "./draggable-timed-block";
import { GUTTER_WIDTH_PX, HEADER_ROW_HEIGHT_PX } from "./grid-metrics";

const ROW_HEIGHT_PX = 26;
/** Prefijo del `id` de una celda de esta fila usada como `droppable` (reporte "una tarea de todo el día no se puede arrastrar a otro día"): el destino de "este bloque pasa a ser de todo el día en este día". */
export const ALL_DAY_DROPPABLE_PREFIX = "calendar-all-day:";
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
 * Una celda de un día de esta fila, como destino de arrastre (reporte "una
 * tarea de todo el día no se puede arrastrar a otro día"): hasta ahora los
 * únicos `droppable` eran las columnas horarias (`time-grid.tsx`), así que
 * soltar acá arriba o no soltaba nada o caía en la grilla con un horario
 * inventado. `data.allDay` es lo que distingue este destino del de una
 * columna de día — `CalendarView.handleDragEnd` no mira el `id`.
 *
 * `pointer-events-none`: `useDroppable` solo necesita el nodo para medirlo,
 * y sin esto la celda taparía los clics sobre el fondo vacío de la fila.
 */
function AllDayDropCell({ dateKey, gridColumn, rowCount }: { dateKey: string; gridColumn: number; rowCount: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${ALL_DAY_DROPPABLE_PREFIX}${dateKey}`, data: { dateKey, allDay: true } });
  return (
    <div
      ref={setNodeRef}
      // Mismo `info` sólido que la sombra de destino de la grilla horaria
      // (`time-grid.tsx`): un solo color para "acá va a caer" en toda la
      // vista, sin que compita con el punteado de origen ni con el `primary`
      // de crear un bloque nuevo.
      className={cn("pointer-events-none rounded-md", isOver && "border-2 border-info bg-info/10")}
      style={{ gridColumn, gridRow: `1 / span ${rowCount}` }}
      data-all-day-drop={dateKey}
      aria-hidden
    />
  );
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
  const { active } = useDndContext();
  const isMovingBlock = (active?.data.current as { kind?: string } | undefined)?.kind === "move-block";
  const merged = blocks.filter((block) => block.allDay).concat(previewBlocks.filter((block) => block.allDay).map((block) => ({ ...block, isPreview: true })));
  const positioned = layoutAllDayRow(merged, mountedDays);
  // Mientras se arrastra un bloque, la fila existe aunque esté vacía: si no,
  // un bloque con horario no tendría dónde soltarse en un día que todavía no
  // tiene nada de todo el día — que es justo el caso más común. Un chip de
  // hábito sin horario no cuenta: no tiene forma de "todo el día" (D-H, su
  // override es una hora puntual), así que para ese gesto la fila sigue
  // apareciendo y desapareciendo como siempre.
  if (positioned.length === 0 && !isMovingBlock) return null;

  const rowCount = Math.max(1, ...positioned.map((p) => p.rowCount));

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
        {isMovingBlock &&
          mountedDays.map((dateKey, index) => <AllDayDropCell key={`drop-${dateKey}`} dateKey={dateKey} gridColumn={index + 1} rowCount={rowCount} />)}

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
