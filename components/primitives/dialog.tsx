"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { OVERLAY_MODAL } from "./overlay";

/**
 * Diálogo propio de Trazio (bloque 2.3): capa de identidad sobre `Dialog`
 * de shadcn/ui, que ya resuelve atrapar el foco dentro del diálogo, cerrar
 * con `Escape`, devolver el foco al elemento que lo abrió al cerrarse, y
 * anunciarse a lectores de pantalla con rol y título (`DialogTitle` se
 * asocia solo vía `aria-labelledby`). No se reimplementa nada de eso acá.
 *
 * Lo que agrega esta capa es la convención de Trazio: un diálogo siempre
 * tiene título (nunca uno mudo para el lector de pantalla), `modal`
 * explícito en vez de heredado en silencio del valor por defecto, y el
 * ancho como una variante nombrada en vez de una clase suelta repetida en
 * cada consumidor.
 */
export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "default",
  className,
  hideTitle = false,
  showCloseButton = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** `lg` para formularios con más campos (proyecto, configuración); `xl` para contenido rico con varios selectores en fila; `2xl` para layouts de dos columnas que necesitan más ancho, como el detalle de tarea (`detalle-de-tarea-en-dos-columnas`); `default` cubre el resto. */
  size?: "default" | "lg" | "xl" | "2xl";
  className?: string;
  /** El título sigue announced para el lector de pantalla (`aria-labelledby`), pero se oculta visualmente: lo usa un consumidor que ya muestra su propio encabezado rico (detalle de tarea) y no quiere repetirlo. Mismo patrón que `ui/command.tsx`. */
  hideTitle?: boolean;
  /** `false` cuando el consumidor ya trae su propio control de cierre en el encabezado y mostrar los dos sería redundante. */
  showCloseButton?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={OVERLAY_MODAL}>
      <DialogContent
        showCloseButton={showCloseButton}
        className={cn(
          size === "lg"
            ? "sm:max-w-lg"
            : size === "xl"
              ? "sm:max-w-2xl"
              : size === "2xl"
                ? // `2xl` (1024px) es la primera variante más ancha que el corte
                  // a pantalla completa en teléfono (767px, `use-media-query`):
                  // las demás nunca llegan a un viewport de escritorio donde
                  // `sm:max-w-*` reemplaza el margen de `calc(100%-2rem)` de la
                  // regla base. Sin `min(...)`, un viewport de 768-1024px (un
                  // tablet o notebook chica) deja el diálogo pegado a los dos
                  // bordes, sin margen visible.
                  "sm:max-w-[min(64rem,calc(100%-2rem))]"
                : "sm:max-w-md",
          className,
        )}
      >
        <DialogHeader className={hideTitle ? "sr-only" : undefined}>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
