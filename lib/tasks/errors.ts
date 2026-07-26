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
  if (/no pertenece al usuario/i.test(message)) return "owner";
  if (/due_date_or_due_at_exclusive/i.test(message)) return "exclusive";
  if (/fetch|network/i.test(message)) return "network";
  return "desconocido";
}

export function reportTaskError(error: unknown): void {
  const message = error instanceof Error ? error.message : "";
  const { quePaso, porQue, queHacer } = MENSAJES[classify(message)];
  toastError(quePaso, porQue, queHacer);
}
