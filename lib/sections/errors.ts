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

export function reportSectionError(error: unknown): void {
  const message = error instanceof Error ? error.message : "";
  const { quePaso, porQue, queHacer } = MENSAJES[classify(message)];
  toastError(quePaso, porQue, queHacer);
}
