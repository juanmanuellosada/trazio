import { toastError } from "@/lib/toast";

/**
 * Traducción de errores de comentarios a mensajes de tres partes
 * (`.claude/rules/copy.md`), mismo patrón que `lib/labels/errors.ts`. Sin
 * caso de duplicado: un comentario no tiene ninguna restricción `unique`.
 */
function classify(error: unknown): "network" | "desconocido" {
  const message = error instanceof Error ? error.message : "";
  if (/fetch|network/i.test(message)) return "network";
  return "desconocido";
}

const MENSAJES = {
  network: {
    quePaso: "No pudimos guardar el comentario",
    porQue: "se cortó la conexión",
    queHacer: "Revisá tu internet y volvé a intentar.",
  },
  desconocido: {
    quePaso: "No pudimos completar la acción",
    porQue: "algo falló de nuestro lado",
    queHacer: "Volvé a intentar en un momento.",
  },
} as const;

export function reportCommentError(error: unknown): void {
  const { quePaso, porQue, queHacer } = MENSAJES[classify(error)];
  toastError(quePaso, porQue, queHacer);
}
