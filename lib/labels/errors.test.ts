import { describe, expect, it, vi } from "vitest";
import { toastError } from "@/lib/toast";
import { reportLabelError } from "./errors";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn() }));

describe("reportLabelError", () => {
  it("traduce el nombre duplicado (23505) al mensaje de tres partes", () => {
    reportLabelError({ code: "23505", message: "duplicate key value violates unique constraint" });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos guardar la etiqueta",
      "ya tenés una etiqueta con ese nombre",
      "Elegí otro nombre y volvé a intentar.",
    );
  });

  it("traduce un fallo de red", () => {
    reportLabelError(new Error("network error: fetch failed"));

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos guardar el cambio",
      "se cortó la conexión",
      "Revisá tu internet y volvé a intentar.",
    );
  });

  it("cae a un mensaje genérico ante un error desconocido", () => {
    reportLabelError(new Error("algo raro"));

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos completar la acción",
      "algo falló de nuestro lado",
      "Volvé a intentar en un momento.",
    );
  });
});
