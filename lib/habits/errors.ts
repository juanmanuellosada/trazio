import { toastError } from "@/lib/toast";

/**
 * Traducción de errores de hábitos a mensajes de tres partes
 * (`.claude/rules/copy.md`), mismo patrón que `lib/tasks/errors.ts` y
 * `lib/labels/errors.ts`. Los dos primeros casos son los rechazos propios
 * de la capa de datos de este bloque (D-E: solo se marca/desmarca hoy;
 * spec de reprogramación puntual: el override no mueve el hábito de día).
 */
const MENSAJES = {
  soloHoy: {
    quePaso: "No pudimos actualizar el hábito",
    porQue: "solo se puede marcar o desmarcar el día de hoy",
    queHacer: "Si ves una fecha distinta a la de hoy, recargá la página.",
  },
  overrideInvalido: {
    quePaso: "No pudimos reprogramar el horario",
    porQue: "ese día no le corresponde al hábito según su frecuencia",
    queHacer: "Elegí un día que sí le toque al hábito.",
  },
  overrideAntesDeCreacion: {
    quePaso: "No pudimos reprogramar el horario",
    porQue: "ese día es anterior a la creación del hábito",
    queHacer: "Elegí un día a partir de cuando creaste el hábito.",
  },
  overrideArchivado: {
    quePaso: "No pudimos reprogramar el horario",
    porQue: "ese hábito está archivado",
    queHacer: "Desarchivalo para poder reprogramarlo.",
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
  if (/solo se puede marcar o desmarcar el día de hoy/i.test(message)) return "soloHoy";
  if (/anterior a la creación del hábito/i.test(message)) return "overrideAntesDeCreacion";
  if (/hábito está archivado/i.test(message)) return "overrideArchivado";
  if (/no le corresponde al hábito/i.test(message)) return "overrideInvalido";
  if (/fetch|network/i.test(message)) return "network";
  return "desconocido";
}

export function reportHabitError(error: unknown): void {
  const message = error instanceof Error ? error.message : "";
  const { quePaso, porQue, queHacer } = MENSAJES[classify(message)];
  toastError(quePaso, porQue, queHacer);
}
