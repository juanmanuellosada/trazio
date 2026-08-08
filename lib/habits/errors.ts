import type { PostgrestError } from "@supabase/supabase-js";
import { toastError } from "@/lib/toast";

/**
 * Traducción de errores de hábitos a mensajes de tres partes
 * (`.claude/rules/copy.md`), mismo patrón que `lib/tasks/errors.ts` y
 * `lib/labels/errors.ts`. Los dos primeros casos son los rechazos propios
 * de la capa de datos de este bloque (el futuro no se puede marcar ni
 * desmarcar, decisión del dueño; spec de reprogramación puntual: el
 * override no mueve el hábito de día). `duplicado` es de
 * `openspec/changes/recordatorios-de-habitos` (tarea 5.3): el
 * `unique (habit_id, offset_minutes)` de `habit_reminders`
 * (`20260808000000_habit_reminders.sql`) no se valida antes con una
 * consulta, se deja fallar y se traduce acá — clasificado por
 * `error.code === "23505"` cuando el `PostgrestError` lo expone, mismo
 * criterio que `lib/labels/errors.ts` con el nombre de etiqueta duplicado.
 */
const MENSAJES = {
  diaFuturo: {
    quePaso: "No pudimos actualizar el hábito",
    porQue: "no se puede marcar ni desmarcar un día futuro",
    queHacer: "Elegí hoy o un día anterior.",
  },
  duplicado: {
    quePaso: "No pudimos agregar el recordatorio",
    porQue: "ese hábito ya tiene un recordatorio con ese mismo desfase",
    queHacer: "Elegí otro momento o quitá el que ya está.",
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

function classify(error: unknown, message: string): keyof typeof MENSAJES {
  const code = (error as Partial<PostgrestError> | null)?.code;
  if (code === "23505") return "duplicado";
  if (/no se puede marcar ni desmarcar un día futuro/i.test(message)) return "diaFuturo";
  if (/anterior a la creación del hábito/i.test(message)) return "overrideAntesDeCreacion";
  if (/hábito está archivado/i.test(message)) return "overrideArchivado";
  if (/no le corresponde al hábito/i.test(message)) return "overrideInvalido";
  if (/fetch|network/i.test(message)) return "network";
  return "desconocido";
}

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

export function reportHabitError(error: unknown): void {
  const message = extractMessage(error);
  const { quePaso, porQue, queHacer } = MENSAJES[classify(error, message)];
  toastError(quePaso, porQue, queHacer);
}
