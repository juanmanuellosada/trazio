import { toastError } from "@/lib/toast";

/**
 * Traducción de errores de filtros a mensajes de tres partes
 * (`.claude/rules/copy.md`), mismo patrón que `lib/labels/errors.ts`. A
 * diferencia de `labels`, `filters` no tiene una restricción `unique` sobre
 * el nombre (dos filtros pueden llamarse igual), así que no hay un caso de
 * "duplicado" que clasificar acá.
 */
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

function classify(error: unknown): keyof typeof MENSAJES {
  const message = error instanceof Error ? error.message : "";
  if (/fetch|network/i.test(message)) return "network";
  return "desconocido";
}

export function reportFilterError(error: unknown): void {
  const { quePaso, porQue, queHacer } = MENSAJES[classify(error)];
  toastError(quePaso, porQue, queHacer);
}
