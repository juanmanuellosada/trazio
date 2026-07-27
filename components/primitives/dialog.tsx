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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** `lg` para formularios con más campos (proyecto, configuración); `default` cubre el resto. */
  size?: "default" | "lg";
  className?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={OVERLAY_MODAL}>
      <DialogContent className={cn(size === "lg" ? "sm:max-w-lg" : "sm:max-w-md", className)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}
