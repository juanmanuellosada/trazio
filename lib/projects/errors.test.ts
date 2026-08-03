import { describe, expect, it, vi } from "vitest";
import { toastError } from "@/lib/toast";
import { reportProjectError } from "./errors";

/**
 * `supabase-js` (`.from("projects").update(...)`, sin `.throwOnError()`)
 * nunca lanza un `Error` real: el `error` es el cuerpo JSON de la respuesta
 * ya parseado (`PostgrestBuilder.processResponse`), un objeto plano
 * `{ message, details, hint, code }` — igual que documenta
 * `lib/tasks/errors.ts`. Los mensajes de anidamiento, ancestro propio y
 * Bandeja de entrada vienen de disparadores reales de la base
 * (`supabase/migrations/20260726011602_projects.sql`,
 * `20260726011604_projects_inbox_protection.sql`), así que antes de este
 * arreglo **ninguno** de esos tres casos se clasificaba nunca: todos caían
 * en "desconocido" sin importar la causa real.
 */
vi.mock("@/lib/toast", () => ({ toastError: vi.fn() }));

describe("reportProjectError — el error real de supabase-js no es un `instanceof Error`", () => {
  it("tope de anidamiento (disparador real de la base) se clasifica igual que un `Error`", () => {
    reportProjectError({ message: "Los proyectos admiten como máximo 3 niveles de anidamiento", details: null, hint: null, code: "P0001" });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos mover el proyecto",
      "los proyectos admiten como máximo tres niveles de anidamiento",
      "Elegí un destino con menos niveles y volvé a intentar.",
    );
  });

  it("un proyecto como su propio ancestro (disparador real de la base) se clasifica igual que un `Error`", () => {
    reportProjectError({ message: "Un proyecto no puede ser su propio ancestro", details: null, hint: null, code: "P0001" });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos mover el proyecto",
      "quedaría anidado dentro de sí mismo o de uno de sus propios subproyectos",
      "Elegí otro destino y volvé a intentar.",
    );
  });

  it("protección de la Bandeja de entrada (disparador real de la base) se clasifica igual que un `Error`", () => {
    reportProjectError({ message: "La Bandeja de entrada no se puede archivar", details: null, hint: null, code: "P0001" });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos completar la acción",
      "la Bandeja de entrada no se puede borrar, archivar ni modificar así",
      "Elegí otro proyecto.",
    );
  });

  it("un fallo de red real (objeto plano, no `instanceof Error`) se traduce como corte de conexión", () => {
    reportProjectError({ message: "TypeError: Failed to fetch", details: "", hint: "", code: "" });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos guardar el cambio",
      "se cortó la conexión",
      "Revisá tu internet y volvé a intentar.",
    );
  });

  it("sin `.message` de texto (o sin error), cae en 'desconocido' sin romper", () => {
    reportProjectError({ code: "23505" });

    expect(toastError).toHaveBeenCalledWith(
      "No pudimos completar la acción",
      "algo falló de nuestro lado",
      "Volvé a intentar en un momento.",
    );
  });
});
