"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { TaskDetailContent } from "./task-detail-content";
import { useTaskDetail } from "./task-detail-context";

const WIDTH_STORAGE_KEY = "trazio:task-detail-width";
const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 320;
const MAX_WIDTH = 720;

function clampWidth(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

/**
 * Overlay del detalle de tarea (bloque 7.10): panel lateral redimensionable
 * en escritorio, que recuerda el último ancho elegido (`localStorage`, sin
 * necesidad de una columna nueva en `user_preferences` para esto), y
 * pantalla completa en teléfono. Reutiliza `Sheet` (ya instalado en el
 * bloque 5) en los dos casos: da foco atrapado y cierre con `Escape` gratis
 * (`.claude/rules/frontend.md`), solo cambia el ancho.
 *
 * Vive una sola vez en `app/(app)/layout.tsx`, junto al resto de los
 * providers: cualquier fila de tarea, en cualquier vista, abre el mismo
 * panel a través de `useTaskDetail()`.
 */
export function TaskDetailPanel() {
  const { openTaskId, close } = useTaskDetail();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const widthRef = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    const stored = window.localStorage.getItem(WIDTH_STORAGE_KEY);
    if (!stored) return;
    const parsed = clampWidth(Number(stored));
    if (Number.isFinite(parsed)) {
      // En el servidor no hay `localStorage`: el primer render siempre usa
      // `DEFAULT_WIDTH`, y se corrige acá después de montar (mismo patrón
      // que `app-sidebar.tsx` para el colapso del panel lateral).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ver comentario de arriba
      setWidth(parsed);
      widthRef.current = parsed;
    }
  }, []);

  function handleResizeStart(event: ReactPointerEvent) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = widthRef.current;

    function onMove(moveEvent: PointerEvent) {
      const next = clampWidth(startWidth + (startX - moveEvent.clientX));
      widthRef.current = next;
      setWidth(next);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(widthRef.current));
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <Sheet open={openTaskId != null} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        aria-label="Detalle de la tarea"
        className={cn("gap-0 overflow-hidden p-0 sm:max-w-none", isMobile && "w-full")}
        style={isMobile ? undefined : { width }}
      >
        {!isMobile && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Redimensionar el panel de detalle"
            tabIndex={-1}
            onPointerDown={handleResizeStart}
            className="absolute inset-y-0 left-0 z-10 w-1 cursor-col-resize touch-none hover:bg-primary/30"
          />
        )}
        {openTaskId && <TaskDetailContent taskId={openTaskId} onClose={close} />}
      </SheetContent>
    </Sheet>
  );
}
