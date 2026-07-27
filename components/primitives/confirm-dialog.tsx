"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
/**
 * Confirmación propia de Trazio (bloque 2.6): reemplaza `window.confirm` en
 * toda la app. Comparte la identidad visual del diálogo propio —mismo
 * radio, mismo tratamiento de borde, mismo pie con fondo diferenciado,
 * ambos vienen del mismo `components.json` de shadcn/ui— pero se construye
 * sobre `AlertDialog` en vez de sobre `AppDialog`: es la primitiva con el
 * rol de accesibilidad correcto para una decisión que hay que tomar antes
 * de poder seguir (`role="alertdialog"`), algo que el `role="dialog"`
 * genérico de `AppDialog` no comunica.
 *
 * `AlertDialog` ya resuelve foco atrapado, `Escape`, devolución de foco y
 * anuncio a lectores de pantalla — igual que `Dialog` — así que esta capa
 * se limita a la acción de confirmar/cancelar y al color destructivo
 * (`--error`, nunca el rojo de marca) cuando la acción no se puede deshacer.
 * A diferencia de `Dialog`, `AlertDialog` tampoco expone `modal` como prop:
 * una confirmación es modal siempre, así que no hay nada que fijar acá con
 * `overlay.ts` (igual que en `context-menu.tsx`).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive = false,
  confirmDisabled = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Acción irreversible (borrar proyecto, borrar tarea): botón de confirmar en rojo destructivo. */
  destructive?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
