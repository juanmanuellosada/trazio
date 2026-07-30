import { describe, expect, it } from "vitest";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { orderTasks } from "./order-tasks";

function task(overrides: Partial<TaskRow>): TaskRow {
  return {
    id: overrides.id ?? "id",
    project_id: "p1",
    section_id: null,
    parent_id: null,
    title: "Tarea",
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 0,
    labels: [],
    ...overrides,
  };
}

describe("orderTasks (bloque 6.6, requirement Orden configurable)", () => {
  it('"manual" ordena por position', () => {
    const tasks = [task({ id: "b", position: 2000 }), task({ id: "a", position: 1000 })];
    expect(orderTasks(tasks, "manual", "America/Argentina/Buenos_Aires").map((t) => t.id)).toEqual(["a", "b"]);
  });

  it('"nombre" ordena alfabéticamente', () => {
    const tasks = [task({ id: "b", title: "Zapallo" }), task({ id: "a", title: "Arroz" })];
    expect(orderTasks(tasks, "nombre", "America/Argentina/Buenos_Aires").map((t) => t.id)).toEqual(["a", "b"]);
  });

  it('"prioridad" ordena de mayor a menor prioridad (1 primero)', () => {
    const tasks = [task({ id: "baja", priority: 4 }), task({ id: "urgente", priority: 1 })];
    expect(orderTasks(tasks, "prioridad", "America/Argentina/Buenos_Aires").map((t) => t.id)).toEqual([
      "urgente",
      "baja",
    ]);
  });

  it('"fecha" ordena por vencimiento ascendente, con las sin fecha al final', () => {
    const tasks = [
      task({ id: "sin-fecha" }),
      task({ id: "tarde", due_date: "2026-08-02" }),
      task({ id: "temprano", due_date: "2026-08-01" }),
    ];
    expect(orderTasks(tasks, "fecha", "America/Argentina/Buenos_Aires").map((t) => t.id)).toEqual([
      "temprano",
      "tarde",
      "sin-fecha",
    ]);
  });

  it("no muta el arreglo original", () => {
    const tasks = [task({ id: "b", position: 2000 }), task({ id: "a", position: 1000 })];
    orderTasks(tasks, "manual", "America/Argentina/Buenos_Aires");
    expect(tasks.map((t) => t.id)).toEqual(["b", "a"]);
  });
});
