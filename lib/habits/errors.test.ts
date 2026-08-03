import { describe, expect, it, vi } from "vitest";
import { toastError } from "@/lib/toast";
import { reportHabitError } from "./errors";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn() }));

describe("reportHabitError — el error real de supabase-js no es un `instanceof Error`", () => {
  it("un fallo de red real (objeto plano que arma `PostgrestBuilder` cuando `fetch` rechaza, sin `.throwOnError()`) se traduce como corte de conexión", () => {
    reportHabitError({ message: "TypeError: Failed to fetch", details: "", hint: "", code: "" });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos guardar el cambio",
      "se cortó la conexión",
      "Revisá tu internet y volvé a intentar.",
    );
  });

  it("sin `.message` de texto, cae en el mensaje genérico sin romper", () => {
    reportHabitError({ code: "23505" });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos completar la acción",
      "algo falló de nuestro lado",
      "Volvé a intentar en un momento.",
    );
  });
});
