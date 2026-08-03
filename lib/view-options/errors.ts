import { toastError } from "@/lib/toast";

/** Mensaje de tres partes (`.claude/rules/copy.md`) para cuando no se pudo guardar una opción de vista, mismo patrón que `lib/filters/errors.ts`. */

/**
 * `supabase-js` (sin `.throwOnError()`) nunca lanza un `Error` real: el
 * `error` que llega es el cuerpo JSON de la respuesta ya parseado, un
 * objeto plano `{ message, details, hint, code }` (ver `lib/tasks/errors.ts`).
 * Se acepta cualquier objeto con un `.message` de texto, no solo instancias
 * de `Error`.
 */
function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "";
}

export function reportViewOptionsError(error: unknown): void {
  const message = extractMessage(error);
  const porQue = /fetch|network/i.test(message) ? "se cortó la conexión" : "algo falló de nuestro lado";
  toastError("No pudimos guardar esta opción de vista", porQue, "Volvé a intentar en un momento.");
}
