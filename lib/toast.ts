import { toast } from "sonner";

/**
 * Único punto desde el que se disparan toasts (bloque 5.6): nada de
 * `toast()` suelto en componentes sueltos, para que el formato no diverja.
 *
 * El error respeta las tres partes de `.claude/rules/copy.md`: "qué pasó"
 * y "por qué" arman el título, "qué hacer" es la descripción. Ejemplo:
 * `toastError("No pudimos guardar el cambio", "se cortó la conexión",
 * "Revisá tu internet y volvé a intentar.")` produce el mismo texto que
 * usa `copy.md` como referencia.
 */
export function toastError(quePaso: string, porQue: string, queHacer: string): void {
  toast.error(`${quePaso} porque ${porQue}.`, { description: queHacer });
}

export function toastSuccess(
  message: string,
  options?: { action?: { label: string; onClick: () => void } },
): void {
  toast.success(message, options);
}
