"use client";

import { AppDialog } from "@/components/primitives/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TaskDetailContent } from "./task-detail-content";
import { useTaskDetail } from "./task-detail-context";

/**
 * Overlay del detalle de tarea (bloque 6, D28): modal centrado por encima
 * de la pantalla en escritorio, sin ningún control para redimensionarlo, y
 * pantalla completa en teléfono — eso último no cambia con D28. En
 * escritorio usa `AppDialog` (bloque 2.3), que ya resuelve atrapar el foco,
 * devolverlo al cerrar y cerrar con `Escape`; en teléfono sigue usando
 * `Sheet` a pantalla completa, igual que antes del cambio.
 *
 * Antes había un único `Sheet` que cambiaba de ancho (panel lateral
 * redimensionable, con el ancho guardado en `localStorage`) o pasaba a
 * ancho completo en teléfono. Un modal centrado no se redimensiona, así
 * que esa persistencia desaparece con el cambio en vez de migrarse (D28).
 *
 * Vive una sola vez en `app/(app)/layout.tsx`, junto al resto de los
 * providers: cualquier fila de tarea, en cualquier vista, abre el mismo
 * overlay a través de `useTaskDetail()`.
 */
export function TaskDetailPanel() {
  const { openTaskId, close } = useTaskDetail();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const open = openTaskId != null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(next) => !next && close()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          aria-label="Detalle de la tarea"
          className="w-full! gap-0 overflow-hidden p-0 sm:max-w-none"
        >
          {openTaskId && <TaskDetailContent taskId={openTaskId} onClose={close} />}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Detalle de la tarea"
      hideTitle
      showCloseButton={false}
      size="2xl"
      className="flex h-[85vh] flex-col gap-0 overflow-hidden p-0"
    >
      {openTaskId && <TaskDetailContent taskId={openTaskId} onClose={close} />}
    </AppDialog>
  );
}
