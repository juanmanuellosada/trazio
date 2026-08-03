import { toastError } from "@/lib/toast";

/** Traducción de errores de secciones a mensajes de tres partes (`.claude/rules/copy.md`). */
function classify(message: string): "network" | "desconocido" {
  return /fetch|network/i.test(message) ? "network" : "desconocido";
}

const MENSAJES = {
  network: {
    quePaso: "No pudimos guardar el cambio",
    porQue: "se cortó la conexión",
    queHacer: "Revisá tu internet y volvé a intentar.",
  },
  desconocido: {
    quePaso: "No pudimos completar la acción",
    porQue: "algo falló de nuestro lado",
    queHacer: "Volvé a intentar en un momento.",
  },
} as const;

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

export function reportSectionError(error: unknown): void {
  const message = extractMessage(error);
  const { quePaso, porQue, queHacer } = MENSAJES[classify(message)];
  toastError(quePaso, porQue, queHacer);
}
