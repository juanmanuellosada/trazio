import { toastError } from "@/lib/toast";

/** Mensaje de tres partes (`.claude/rules/copy.md`) para cuando no se pudo guardar una opción de vista, mismo patrón que `lib/filters/errors.ts`. */
export function reportViewOptionsError(error: unknown): void {
  const message = error instanceof Error ? error.message : "";
  const porQue = /fetch|network/i.test(message) ? "se cortó la conexión" : "algo falló de nuestro lado";
  toastError("No pudimos guardar esta opción de vista", porQue, "Volvé a intentar en un momento.");
}
