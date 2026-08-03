import { toastError } from "@/lib/toast";

/**
 * Traducción de errores de tareas a mensajes de tres partes
 * (`.claude/rules/copy.md`). `owner` cubre el trigger
 * `tasks_validate_owner_trigger` (mover a un proyecto o sección ajenos) y
 * `exclusive` el constraint `tasks_due_date_or_due_at_exclusive`.
 */
const MENSAJES = {
  owner: {
    quePaso: "No pudimos mover la tarea",
    porQue: "el proyecto o la sección de destino no te pertenecen",
    queHacer: "Elegí otro destino y volvé a intentar.",
  },
  exclusive: {
    quePaso: "No pudimos guardar la fecha",
    porQue: "una tarea no puede tener fecha con hora y sin hora al mismo tiempo",
    queHacer: "Elegí una sola forma de fecha y volvé a intentar.",
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
  // `tasks_validate_owner_trigger` (migración `20260726013245`) tiene tres
  // mensajes distintos: dos dicen "no pertenece al usuario" (proyecto o
  // sección ajenos) y el tercero dice "no pertenece al proyecto" (sección de
  // otro proyecto, aunque sea propia) — sin la segunda mitad del patrón, ese
  // tercer caso caía en "desconocido" ("algo falló de nuestro lado"), un
  // mensaje que no es cierto: sí sabemos qué pasó.
  if (/no pertenece al (usuario|proyecto)/i.test(message)) return "owner";
  if (/due_date_or_due_at_exclusive/i.test(message)) return "exclusive";
  if (/fetch|network/i.test(message)) return "network";
  return "desconocido";
}

/**
 * `supabase-js` (`.from("tasks").update(...).eq(...)`, sin `.throwOnError()`)
 * nunca lanza un `PostgrestError` de verdad: el `error` que devuelve es el
 * cuerpo JSON de la respuesta ya parseado (`PostgrestBuilder.processResponse`,
 * `@supabase/postgrest-js`), un objeto plano `{ message, details, hint, code
 * }`. El código de este proyecto lo relanza a mano (`if (error) throw
 * error`), así que lo que llega acá **nunca** es un `instanceof Error`
 * — antes de esto, `classify` jamás se ejecutaba con el mensaje real y todo
 * caía en "desconocido", sin importar la causa. Se acepta cualquier objeto
 * con un `.message` de texto, no solo instancias de `Error`.
 */
function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return "";
}

export function reportTaskError(error: unknown): void {
  const message = extractMessage(error);
  const { quePaso, porQue, queHacer } = MENSAJES[classify(message)];
  toastError(quePaso, porQue, queHacer);
}
