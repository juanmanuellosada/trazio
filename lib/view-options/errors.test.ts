import { describe, expect, it, vi } from "vitest";
import { toastError } from "@/lib/toast";
import { reportViewOptionsError } from "./errors";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn() }));

describe("reportViewOptionsError — el error real de supabase-js no es un `instanceof Error`", () => {
  it("un fallo de red real (objeto plano que arma `PostgrestBuilder` cuando `fetch` rechaza, sin `.throwOnError()`) se traduce como corte de conexión", () => {
    reportViewOptionsError({ message: "TypeError: Failed to fetch", details: "", hint: "", code: "" });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos guardar esta opción de vista",
      "se cortó la conexión",
      "Volvé a intentar en un momento.",
    );
  });

  it("sin `.message` de texto, cae en el mensaje genérico sin romper", () => {
    reportViewOptionsError({ code: "23505" });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos guardar esta opción de vista",
      "algo falló de nuestro lado",
      "Volvé a intentar en un momento.",
    );
  });
});
