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

  it("sin `.message` de texto ni `code` reconocido, cae en el mensaje genérico sin romper", () => {
    reportHabitError({});

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos completar la acción",
      "algo falló de nuestro lado",
      "Volvé a intentar en un momento.",
    );
  });

  it("`code: '23505'` (el mismo desfase ya agregado a un hábito) se traduce como duplicado, aunque el mensaje no lo diga", () => {
    reportHabitError({ code: "23505", message: 'duplicate key value violates unique constraint "habit_reminders_habit_id_offset_minutes_key"' });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos agregar el recordatorio",
      "ese hábito ya tiene un recordatorio con ese mismo desfase",
      "Elegí otro momento o quitá el que ya está.",
    );
  });
});
