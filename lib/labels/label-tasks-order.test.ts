import { describe, expect, it } from "vitest";
import { compareLabelTasks } from "./label-tasks-order";

const BA = "America/Argentina/Buenos_Aires";

/**
 * Orden por defecto de la página de una etiqueta (`specs/opciones-de-vista`,
 * requirement "Los defaults de Próximos, Etiqueta y Filtro"): fecha
 * ascendente, sin fecha al final, y a igualdad de fecha por prioridad
 * descendente.
 */
describe("compareLabelTasks", () => {
  it("ordena por fecha de vencimiento ascendente", () => {
    const antes = { due_date: "2026-07-20", due_at: null, priority: 4 };
    const despues = { due_date: "2026-07-25", due_at: null, priority: 4 };
    expect(compareLabelTasks(antes, despues, BA)).toBeLessThan(0);
    expect(compareLabelTasks(despues, antes, BA)).toBeGreaterThan(0);
  });

  it("las tareas sin fecha quedan al final, después de las que sí tienen", () => {
    const conFecha = { due_date: "2026-07-20", due_at: null, priority: 4 };
    const sinFecha = { due_date: null, due_at: null, priority: 4 };
    expect(compareLabelTasks(conFecha, sinFecha, BA)).toBeLessThan(0);
    expect(compareLabelTasks(sinFecha, conFecha, BA)).toBeGreaterThan(0);
  });

  it("a igual fecha, desempata por prioridad descendente", () => {
    const urgente = { due_date: "2026-07-20", due_at: null, priority: 1 };
    const baja = { due_date: "2026-07-20", due_at: null, priority: 4 };
    expect(compareLabelTasks(urgente, baja, BA)).toBeLessThan(0);
  });

  it("dos tareas sin fecha también desempatan por prioridad descendente", () => {
    const urgente = { due_date: null, due_at: null, priority: 1 };
    const baja = { due_date: null, due_at: null, priority: 4 };
    expect(compareLabelTasks(urgente, baja, BA)).toBeLessThan(0);
  });
});
