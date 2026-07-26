import { toastError } from "@/lib/toast";

/**
 * Traducción de errores de proyectos a mensajes de tres partes
 * (`.claude/rules/copy.md`). Las reglas duras viven en la base (tope de 3
 * niveles, sin ciclos, protección de la Bandeja): acá se interpreta el
 * texto que esos triggers ya devuelven, no se reimplementa la regla.
 */
const MENSAJES = {
  hierarchy: {
    quePaso: "No pudimos mover el proyecto",
    porQue: "los proyectos admiten como máximo tres niveles de anidamiento",
    queHacer: "Elegí un destino con menos niveles y volvé a intentar.",
  },
  ancestor: {
    quePaso: "No pudimos mover el proyecto",
    porQue: "quedaría anidado dentro de sí mismo o de uno de sus propios subproyectos",
    queHacer: "Elegí otro destino y volvé a intentar.",
  },
  inbox: {
    quePaso: "No pudimos completar la acción",
    porQue: "la Bandeja de entrada no se puede borrar, archivar ni modificar así",
    queHacer: "Elegí otro proyecto.",
  },
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

function classify(message: string): keyof typeof MENSAJES {
  if (/anidamiento/i.test(message)) return "hierarchy";
  if (/su propio ancestro/i.test(message)) return "ancestor";
  if (/Bandeja de entrada/i.test(message)) return "inbox";
  if (/fetch|network/i.test(message)) return "network";
  return "desconocido";
}

export function reportProjectError(error: unknown): void {
  const message = error instanceof Error ? error.message : "";
  const { quePaso, porQue, queHacer } = MENSAJES[classify(message)];
  toastError(quePaso, porQue, queHacer);
}
