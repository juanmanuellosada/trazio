import { describe, expect, it } from "vitest";
import { compareHoyTasks } from "./hoy-filter";

/**
 * Orden de la vista Hoy (D25): `position` no sirve acá porque las
 * candidatas cruzan proyectos distintos, así que el orden lo da
 * `compareHoyTasks` — primero las tareas con hora, después las de todo el
 * día, y dentro de cada grupo la más vencida (más antigua) primero.
 */
describe("compareHoyTasks", () => {
  it("dos tareas con hora: ordena por due_at ascendente, la más temprana primero", () => {
    const tarde = { due_date: null, due_at: "2026-07-26T18:00:00.000Z" };
    const temprano = { due_date: null, due_at: "2026-07-26T09:00:00.000Z" };
    expect(compareHoyTasks(temprano, tarde)).toBeLessThan(0);
    expect(compareHoyTasks(tarde, temprano)).toBeGreaterThan(0);
  });

  it("dos tareas de todo el día: ordena por due_date ascendente, la más antigua primero", () => {
    const vieja = { due_date: "2026-07-20", due_at: null };
    const nueva = { due_date: "2026-07-25", due_at: null };
    expect(compareHoyTasks(vieja, nueva)).toBeLessThan(0);
    expect(compareHoyTasks(nueva, vieja)).toBeGreaterThan(0);
  });

  it("desempate: una tarea con hora va antes que una de todo el día del mismo día", () => {
    const conHora = { due_date: null, due_at: "2026-07-26T23:00:00.000Z" };
    const todoElDia = { due_date: "2026-07-26", due_at: null };
    expect(compareHoyTasks(conHora, todoElDia)).toBeLessThan(0);
    expect(compareHoyTasks(todoElDia, conHora)).toBeGreaterThan(0);
  });

  it("bloque de atrasadas: la más vencida (más antigua) queda primera, sea con hora o de todo el día", () => {
    // Simula el resultado de filtrar el bloque "Atrasadas": tres tareas
    // vencidas antes de hoy, en orden arbitrario.
    const atrasada3Dias = { due_date: "2026-07-23", due_at: null };
    const atrasadaAyerConHora = { due_date: null, due_at: "2026-07-25T14:00:00.000Z" };
    const atrasadaHoyMuyTemprano = { due_date: null, due_at: "2026-07-26T05:00:00.000Z" };

    const ordenadas = [atrasadaHoyMuyTemprano, atrasada3Dias, atrasadaAyerConHora].sort(compareHoyTasks);

    // Grupo "con hora" primero (cronológico: ayer antes que hoy temprano),
    // después el grupo "todo el día".
    expect(ordenadas).toEqual([atrasadaAyerConHora, atrasadaHoyMuyTemprano, atrasada3Dias]);
  });

  it("sin fecha en ninguna de las dos (no debería pasar en la práctica, pero no debe romper): empatan", () => {
    expect(compareHoyTasks({ due_date: null, due_at: null }, { due_date: null, due_at: null })).toBe(0);
  });
});
