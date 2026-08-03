import { describe, expect, it, vi } from "vitest";
import { toastError } from "@/lib/toast";
import { reportTaskError } from "./errors";

/**
 * Tarea 2.1 de `openspec/changes/panel-con-columnas-por-campo/tasks.md`:
 * `tasks_validate_owner_trigger` (migración `20260726013245`) puede fallar
 * de tres formas distintas al mover una tarea, y las tres tienen que
 * traducirse al mismo mensaje de "owner" — antes de esta prueba, el tercer
 * mensaje ("no pertenece al proyecto", sin la palabra "usuario") caía en
 * "desconocido" ("algo falló de nuestro lado"), que no es cierto: sí se
 * sabe qué pasó. Alcanzable desde el panel agrupado por sección en Próximos
 * y en Hoy, donde las columnas son secciones de **todos** los proyectos:
 * mover una tarjeta a la sección de un proyecto distinto del de la tarea
 * dispara justo este tercer mensaje.
 */
vi.mock("@/lib/toast", () => ({ toastError: vi.fn() }));

describe("reportTaskError — tasks_validate_owner_trigger, los tres mensajes", () => {
  it("proyecto destino ajeno", () => {
    reportTaskError(new Error("El proyecto destino no pertenece al usuario de la tarea"));
    expect(toastError).toHaveBeenCalledWith(
      "No pudimos mover la tarea",
      "el proyecto o la sección de destino no te pertenecen",
      "Elegí otro destino y volvé a intentar.",
    );
  });

  it("sección destino ajena (de otro usuario)", () => {
    reportTaskError(new Error("La sección destino no pertenece al usuario de la tarea"));
    expect(toastError).toHaveBeenCalledWith(
      "No pudimos mover la tarea",
      "el proyecto o la sección de destino no te pertenecen",
      "Elegí otro destino y volvé a intentar.",
    );
  });

  it("sección destino de otro proyecto propio (el caso sin la palabra 'usuario')", () => {
    reportTaskError(new Error("La sección destino no pertenece al proyecto de la tarea"));
    expect(toastError).toHaveBeenCalledWith(
      "No pudimos mover la tarea",
      "el proyecto o la sección de destino no te pertenecen",
      "Elegí otro destino y volvé a intentar.",
    );
  });
});

describe("reportTaskError — el error real de supabase-js no es un `instanceof Error`", () => {
  it("un objeto plano `{ message, details, hint, code }` (la forma real que devuelve `PostgrestBuilder.processResponse` sin `.throwOnError()`) se clasifica igual que un `Error`", () => {
    reportTaskError({ message: "La sección destino no pertenece al proyecto de la tarea", details: null, hint: null, code: "P0001" });
    expect(toastError).toHaveBeenCalledWith(
      "No pudimos mover la tarea",
      "el proyecto o la sección de destino no te pertenecen",
      "Elegí otro destino y volvé a intentar.",
    );
  });

  it("sin `.message` de texto (o sin error), cae en 'desconocido' sin romper", () => {
    reportTaskError({ code: "23505" });
    expect(toastError).toHaveBeenCalledWith(
      "No pudimos completar la acción",
      "algo falló de nuestro lado",
      "Volvé a intentar en un momento.",
    );
  });
});
