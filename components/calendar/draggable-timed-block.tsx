"use client";

import { useState } from "react";
import { parseISO } from "date-fns";
import { useDraggable } from "@dnd-kit/core";
import { AppContextMenu, type AppContextMenuEntry } from "@/components/primitives/context-menu";
import type { CalendarBlock } from "@/lib/calendar/block";
import { localMinutesOfDay, pixelsToMinutes, resizeBlockToPosition, type DragResult } from "@/lib/calendar/drag";
import { cn } from "@/lib/utils";
import { CalendarBlockChip } from "./calendar-block-chip";
import { HOUR_ROW_HEIGHT_PX } from "./grid-metrics";

/** Prefijo del `id` de arrastre de un bloque ya programado: lo usa `CalendarView` para distinguir "mover un bloque" de "programar un hábito sin horario" en un mismo `onDragEnd`. */
export const MOVE_BLOCK_DRAG_PREFIX = "calendar-move-block:";

/**
 * Un bloque con horario, arrastrable para moverlo (tarea 6.1, `@dnd-kit`,
 * `useDraggable`) y con una manija propia para redimensionarlo (tarea 6.2,
 * seguimiento nativo de puntero — estirar un borde no es "soltar sobre un
 * contenedor", así que no encaja en el modelo de `@dnd-kit`, pensado para
 * eso). Las dos interacciones conviven en el mismo elemento sin pisarse:
 * la manija llama a `stopPropagation` en su propio `pointerdown`, así que
 * nunca llega a activar el arrastre de mover, que escucha en el resto del
 * bloque.
 *
 * Solo se ofrece cuando `segment` representa el bloque completo (mismo
 * criterio en el comentario de `disabled` más abajo): un bloque que cruza
 * la medianoche se ve, pero no se arrastra desde acá en esta tanda —
 * alcanza con el selector de fecha y hora (D-G) para ese caso menos común.
 *
 * Solo se spread `listeners` de `useDraggable`, nunca `attributes`: ese
 * segundo objeto agrega `role="button"`/`tabIndex` pensados para cuando
 * `useDraggable` es el único elemento interactivo, pero acá adentro ya
 * hay un `<button>` real (`CalendarBlockChip`) — duplicar el rol rompía
 * `getByRole("button", { name })` (dos coincidencias) y no aporta nada:
 * sin `KeyboardSensor` en el `DndContext`, esos atributos no habilitan
 * arrastre por teclado igual (D24 ya cubre esa alternativa por otro
 * camino, no por hacer accesible el gesto de arrastre en sí).
 */
export function DraggableTimedBlock({
  block,
  segment,
  timezone,
  onSelectBlock,
  onToggleComplete,
  onResizeBlock,
  contextMenuEntries,
  disabled,
}: {
  block: CalendarBlock;
  segment: { startMinutes: number; endMinutes: number; columnIndex: number; columnCount: number };
  timezone: string;
  onSelectBlock?: (block: CalendarBlock) => void;
  onToggleComplete?: (block: CalendarBlock) => void;
  onResizeBlock?: (block: CalendarBlock, range: DragResult) => void;
  /** Clic derecho (grupo 7, D-E): sin entradas, no se envuelve en `AppContextMenu` — un menú vacío no aporta nada. */
  contextMenuEntries?: AppContextMenuEntry[];
  disabled: boolean;
}) {
  // Grupo 4, D-C: ya no se aplica el `transform` de `useDraggable` acá — el
  // nodo original quedaba clipeado por los tres contenedores con
  // desplazamiento anidados de `time-grid.tsx` (mismo problema que ya
  // resolvió `components/board/board.tsx`). Ahora el nodo original se oculta
  // (`isDragging` más abajo) y quien sigue al puntero es la copia dentro del
  // `DragOverlay` de `calendar-view.tsx`.
  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: `${MOVE_BLOCK_DRAG_PREFIX}${block.id}`,
    data: { kind: "move-block" as const, block },
    disabled: disabled || block.isPreview,
  });

  // `previewEndMinutes` sirve dos propósitos: la vista previa en vivo del
  // borde mientras se arrastra (`endMinutes` más abajo) y, por su sola
  // presencia (`!= null`), la marca de "se está redimensionando ahora
  // mismo" — un `ref` no sirve para eso porque leerlo durante el render
  // no dispara un nuevo render (y el linter de hooks lo rechaza).
  const [previewEndMinutes, setPreviewEndMinutes] = useState<number | null>(null);
  const isResizing = previewEndMinutes !== null;

  function handleResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.preventDefault();
    const resizeCallback = onResizeBlock;
    if (!resizeCallback) return;
    const originalStart = parseISO(block.start);
    const startY = event.clientY;
    const originalEndMinutes = localMinutesOfDay(parseISO(block.end), timezone);
    setPreviewEndMinutes(originalEndMinutes);

    function handleMove(moveEvent: PointerEvent) {
      const deltaMinutes = pixelsToMinutes(moveEvent.clientY - startY, HOUR_ROW_HEIGHT_PX);
      const range = resizeBlockToPosition(originalStart, originalEndMinutes + deltaMinutes, timezone);
      setPreviewEndMinutes(localMinutesOfDay(range.end, timezone) || 24 * 60);
    }

    function handleUp(upEvent: PointerEvent) {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setPreviewEndMinutes(null);
      const deltaMinutes = pixelsToMinutes(upEvent.clientY - startY, HOUR_ROW_HEIGHT_PX);
      const range = resizeBlockToPosition(originalStart, originalEndMinutes + deltaMinutes, timezone);
      // `resizeCallback` ya se verificó no nulo antes de registrar estos
      // listeners; TS no propaga esa verificación dentro de una función
      // anidada, aunque la variable sea `const`.
      resizeCallback!(block, range);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  }

  const endMinutes = previewEndMinutes ?? segment.endMinutes;
  const style: React.CSSProperties = {
    top: `${(segment.startMinutes / (24 * 60)) * 100}%`,
    height: `${((endMinutes - segment.startMinutes) / (24 * 60)) * 100}%`,
    left: `${(segment.columnIndex / segment.columnCount) * 100}%`,
    width: `${100 / segment.columnCount}%`,
  };

  const content = (
    <div
      ref={setNodeRef}
      style={style}
      // `isDragging` oculta el nodo original entero (grupo 4, D-C): la
      // copia que sigue al puntero es la del `DragOverlay`, y el hueco de
      // origen lo marca `time-grid.tsx` con su propia sombra — mostrar
      // además este nodo (aunque sea atenuado) duplicaría la marca.
      className={cn("group absolute px-px py-px", (isDragging || isResizing) && "z-20", isDragging && "opacity-0")}
      {...(disabled || block.isPreview ? {} : listeners)}
    >
      <CalendarBlockChip
        block={block}
        variant="timed"
        onSelect={onSelectBlock}
        onToggleComplete={onToggleComplete}
        className={cn(!disabled && !block.isPreview && "touch-none")}
      />
      {/*
       * Manija de redimensionar: nunca en un hábito (decisión del dueño,
       * grupo 1 de `calendario-legible-y-manipulable`) — redimensionar un
       * hábito no se puede persistir (`habit_schedule_overrides` no tiene
       * columna de duración) y ofrecer el gesto sería mentir. El ancla
       * visual (`h-0.5 w-6`) mide lo mismo de siempre, pero el área que
       * reacciona al puntero es más grande que la línea que se ve, y
       * visible con opacidad base (no solo `group-hover`) — en táctil no
       * hay hover, así que la manija de 6px de alto era inalcanzable.
       * Mismo criterio que el casillero de completar de
       * `calendar-block-chip.tsx` (ancla chica, zona de toque más grande
       * fuera del flujo), con una diferencia a propósito: acá el
       * crecimiento es **solo hacia abajo** (`-bottom-3`, nunca hacia
       * arriba). Un bloque de quince minutos mide 12px — crecer también
       * hacia arriba, como el casillero, le dejaría casi sin superficie
       * propia para moverlo o abrirlo (la manija le ganaría el gesto a todo
       * lo demás). Creciendo solo hacia abajo, la franja que ya intercepta
       * el redimensionado no cambia (los mismos 6px de siempre), solo se
       * ensancha el área de toque hacia el espacio libre debajo. Mismo
       * desborde ya documentado sobre el bloque vecino si están pegados sin
       * separación, sin resolverlo tampoco.
       */}
      {!disabled && !block.isPreview && onResizeBlock && block.type !== "habit" && (
        <div
          role="presentation"
          onPointerDown={handleResizePointerDown}
          // `-bottom-3` (-12px) + `h-[18px]`: el borde superior de esta zona
          // queda exactamente donde estaba el ancla original de 6px
          // (`bottom-0 h-1.5`) — no crece hacia arriba —, y el borde
          // inferior se estira 12px más allá del bloque. La línea visual de
          // adentro no se centra (sin `flex`): queda arriba de esta zona,
          // en el mismo lugar de siempre.
          className="absolute inset-x-0 -bottom-3 h-[18px] cursor-ns-resize touch-none opacity-40 group-hover:opacity-100"
        >
          <div className="mx-auto h-0.5 w-6 rounded-full bg-foreground/40" />
        </div>
      )}
    </div>
  );

  // Clic derecho (grupo 7, D-E): un bloque de vista previa nunca recibe
  // gesto ninguno (comentario de la función más arriba), y sin entradas no
  // hay nada que envolver.
  if (block.isPreview || !contextMenuEntries || contextMenuEntries.length === 0) return content;
  return <AppContextMenu items={contextMenuEntries} trigger={content} />;
}
