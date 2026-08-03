import { describe, expect, it } from "vitest";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { UNDATED_COLUMN_ID, UNSECTIONED_COLUMN_ID } from "./panel-columns";
import { dateMovePatch, priorityMovePatch, sectionMovePatch } from "./panel-move";

const TIMEZONE = "America/Argentina/Buenos_Aires";

function fullTask(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    project_id: "proyecto-1",
    section_id: null,
    parent_id: null,
    title: "Tarea",
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 1000,
    labels: [],
    ...overrides,
  };
}

describe("sectionMovePatch (D-C: sección escribe la sección y la posición)", () => {
  it("mover a 'Sin sección' escribe section_id null", () => {
    const patch = sectionMovePatch([], "proyecto-1", UNSECTIONED_COLUMN_ID);
    expect(patch.section_id).toBeNull();
  });

  it("mover a una sección escribe esa sección", () => {
    const patch = sectionMovePatch([], "proyecto-1", "sec-1");
    expect(patch.section_id).toBe("sec-1");
  });

  it("la posición es la última del destino, mismo criterio que cualquier otro movimiento", () => {
    const existing = [
      fullTask({ id: "a", section_id: "sec-1", position: 1000 }),
      fullTask({ id: "b", section_id: "sec-1", position: 2000 }),
      fullTask({ id: "c", section_id: "sec-2", position: 5000 }), // otra sección, no cuenta
    ];
    const patch = sectionMovePatch(existing, "proyecto-1", "sec-1");
    expect(patch.position).toBe(3000);
  });

  it("destino vacío empieza en la posición base", () => {
    const patch = sectionMovePatch([], "proyecto-1", "sec-1");
    expect(patch.position).toBe(1000);
  });

  it("solo cuenta a los hermanos del proyecto indicado, no los de otro", () => {
    const existing = [fullTask({ id: "a", project_id: "otro-proyecto", section_id: "sec-1", position: 9000 })];
    const patch = sectionMovePatch(existing, "proyecto-1", "sec-1");
    expect(patch.position).toBe(1000);
  });
});

describe("dateMovePatch (D-C: fecha escribe due_date, y hoy borra la hora sin avisar — acá tiene que conservarla)", () => {
  it("una tarea sin hora: mover a un día escribe due_date, due_at queda null", () => {
    const patch = dateMovePatch({ due_at: null }, "2026-08-05", TIMEZONE);
    expect(patch).toEqual({ due_date: "2026-08-05", due_at: null });
  });

  it("una tarea CON hora: mover a otro día conserva la hora, no la borra", () => {
    // 14:30 en America/Argentina/Buenos_Aires (UTC-3) del 3 de agosto.
    const withTime = { due_at: "2026-08-03T17:30:00.000Z" };
    const patch = dateMovePatch(withTime, "2026-08-05", TIMEZONE);
    expect(patch.due_date).toBeNull();
    expect(patch.due_at).toBe("2026-08-05T17:30:00.000Z");
  });

  it("mover a 'Sin fecha' borra la fecha entera, hora incluida", () => {
    const withTime = { due_at: "2026-08-03T17:30:00.000Z" };
    const patch = dateMovePatch(withTime, UNDATED_COLUMN_ID, TIMEZONE);
    expect(patch).toEqual({ due_date: null, due_at: null });
  });
});

describe("priorityMovePatch (D-C: dominio cerrado de cuatro)", () => {
  it("mover a una columna de prioridad válida escribe esa prioridad", () => {
    expect(priorityMovePatch("1")).toEqual({ priority: 1 });
    expect(priorityMovePatch("4")).toEqual({ priority: 4 });
  });

  it("un id de columna fuera del dominio no escribe nada", () => {
    expect(priorityMovePatch("9")).toBeNull();
    expect(priorityMovePatch("sin-fecha")).toBeNull();
  });
});
