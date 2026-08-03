import type { PostgrestError } from "@supabase/supabase-js";
import { toastError } from "@/lib/toast";

/**
 * Traducción de errores de etiquetas a mensajes de tres partes
 * (`.claude/rules/copy.md`), mismo patrón que `lib/projects/errors.ts`. El
 * caso importante es el nombre duplicado (`unique (user_id, name)` en
 * `labels`, migración `20260726011612_labels.sql`): no se previene con una
 * consulta previa, se deja fallar la base y se traduce acá — clasificado
 * por `error.code === "23505"` cuando el `PostgrestError` lo expone, más
 * confiable que parsear el mensaje.
 */
const MENSAJES = {
  duplicado: {
    quePaso: "No pudimos guardar la etiqueta",
    porQue: "ya tenés una etiqueta con ese nombre",
    queHacer: "Elegí otro nombre y volvé a intentar.",
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

function classify(error: unknown): keyof typeof MENSAJES {
  const code = (error as Partial<PostgrestError> | null)?.code;
  if (code === "23505") return "duplicado";
  const message = extractMessage(error);
  if (/fetch|network/i.test(message)) return "network";
  return "desconocido";
}

export function reportLabelError(error: unknown): void {
  const { quePaso, porQue, queHacer } = MENSAJES[classify(error)];
  toastError(quePaso, porQue, queHacer);
}
