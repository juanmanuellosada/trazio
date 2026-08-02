import { describe, expect, it, vi } from "vitest";
import { toastError } from "@/lib/toast";
import { reportReminderError } from "./errors";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn() }));

describe("reportReminderError", () => {
  it("avisa en español cuando el service worker todavía no está listo", () => {
    reportReminderError(new Error("service-worker-no-registrado"));

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos activar las notificaciones",
      "el service worker todavía no está listo en este dispositivo",
      "Recargá la página y volvé a intentar.",
    );
  });

  it("traduce la falta de soporte del navegador", () => {
    reportReminderError(new Error("Este navegador no admite notificaciones push."));

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos activar las notificaciones",
      "este navegador o dispositivo no las admite",
      "Probá desde otro navegador.",
    );
  });

  it("traduce el permiso denegado", () => {
    reportReminderError(new Error("permiso-denegado"));

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos activar las notificaciones",
      "el navegador no dio permiso",
      "Habilitá las notificaciones para Trazio en la configuración del navegador y volvé a intentar.",
    );
  });

  it("traduce el rechazo de un relativo sin ninguna fecha (recordatorios-con-hora-de-referencia)", () => {
    reportReminderError(new Error("recordatorio-relativo-sin-fecha"));

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos agregar el recordatorio",
      "esta tarea no tiene ninguna fecha",
      "Poné una fecha en la tarea y volvé a intentar.",
    );
  });
});
