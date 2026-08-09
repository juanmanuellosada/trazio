import { toast } from "sonner";

/**
 * Duración de auto-descarte. Un toast informativo se saca solo del medio
 * rápido; uno con acción de deshacer necesita quedarse más tiempo para que
 * alguien alcance a hacer clic en "Deshacer" antes de que desaparezca. Sin
 * esta diferencia, en una sesión con varias acciones seguidas los toasts se
 * apilan y el área invisible del stack llega a tapar clics reales.
 */
const AUTO_DISMISS_MS = 4000;
const AUTO_DISMISS_CON_ACCION_MS = 8000;

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
  toast.error(`${quePaso} porque ${porQue}.`, { description: queHacer, duration: AUTO_DISMISS_MS });
}

export function toastSuccess(
  message: string,
  options?: { action?: { label: string; onClick: () => void } },
): void {
  toast.success(message, {
    ...options,
    duration: options?.action ? AUTO_DISMISS_CON_ACCION_MS : AUTO_DISMISS_MS,
  });
}

/**
 * Toast que se queda mientras dura una acción que no puede ser optimista
 * (`duplicar-un-proyecto`, D-D: el id lo asigna el servidor y el bucle
 * inserta de a una tarea, así que puede tardar). Devuelve el id para
 * sacarlo con `dismissToast` una vez que la acción termina, sea éxito o
 * error — a diferencia de `toastError`/`toastSuccess`, no se auto-descarta.
 */
export function toastLoading(message: string): string | number {
  return toast.loading(message);
}

export function dismissToast(id: string | number): void {
  toast.dismiss(id);
}
