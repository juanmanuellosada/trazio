import { toastError } from "@/lib/toast";

/** Traducción de errores de recordatorios y push a mensajes de tres partes (`.claude/rules/copy.md`). */
function classify(
  error: unknown,
): "sin-hora" | "permiso-denegado" | "sin-soporte" | "sw-no-listo" | "network" | "desconocido" {
  const message = error instanceof Error ? error.message : "";
  if (message === "recordatorio-relativo-sin-hora") return "sin-hora";
  if (message === "permiso-denegado") return "permiso-denegado";
  if (message === "service-worker-no-registrado") return "sw-no-listo";
  if (/no admite notificaciones|clave pública VAPID/i.test(message)) return "sin-soporte";
  if (/fetch|network/i.test(message)) return "network";
  return "desconocido";
}

const MENSAJES = {
  "sin-hora": {
    quePaso: "No pudimos agregar el recordatorio",
    porQue: "esta tarea no tiene fecha y hora definidas",
    queHacer: "Poné una fecha con hora en la tarea y volvé a intentar.",
  },
  "permiso-denegado": {
    quePaso: "No pudimos activar las notificaciones",
    porQue: "el navegador no dio permiso",
    queHacer: "Habilitá las notificaciones para Trazio en la configuración del navegador y volvé a intentar.",
  },
  "sin-soporte": {
    quePaso: "No pudimos activar las notificaciones",
    porQue: "este navegador o dispositivo no las admite",
    queHacer: "Probá desde otro navegador.",
  },
  "sw-no-listo": {
    quePaso: "No pudimos activar las notificaciones",
    porQue: "el service worker todavía no está listo en este dispositivo",
    queHacer: "Recargá la página y volvé a intentar.",
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

export function reportReminderError(error: unknown): void {
  const { quePaso, porQue, queHacer } = MENSAJES[classify(error)];
  toastError(quePaso, porQue, queHacer);
}
