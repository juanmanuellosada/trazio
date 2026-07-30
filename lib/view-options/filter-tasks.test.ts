import { describe, expect, it } from "vitest";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { applyQuickFilters } from "./filter-tasks";
import { defaultOptionsForViewKey } from "./schema";

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

describe("applyQuickFilters (bloque 6.6, requirements de filtros rápidos y mostrar completadas)", () => {
  it("mostrar completadas en false saca las completadas de la vista", () => {
    const tasks = [task({ id: "pendiente" }), task({ id: "completada", completed_at: "2026-08-01T00:00:00Z" })];
    const result = applyQuickFilters(tasks, defaultOptionsForViewKey("bandeja").quickFilters, false);
    expect(result.map((t) => t.id)).toEqual(["pendiente"]);
  });

  it("mostrar completadas en true las conserva", () => {
    const tasks = [task({ id: "pendiente" }), task({ id: "completada", completed_at: "2026-08-01T00:00:00Z" })];
    const result = applyQuickFilters(tasks, defaultOptionsForViewKey("bandeja").quickFilters, true);
    expect(result.map((t) => t.id)).toEqual(["pendiente", "completada"]);
  });

  it("filtra por prioridad", () => {
    const tasks = [task({ id: "urgente", priority: 1 }), task({ id: "baja", priority: 4 })];
    const result = applyQuickFilters(tasks, { deadline: "cualquiera", priority: 1, labelId: null }, true);
    expect(result.map((t) => t.id)).toEqual(["urgente"]);
  });

  it("combina prioridad y etiqueta a la vez", () => {
    const tasks = [
      task({ id: "match", priority: 1, labels: [{ id: "l1", name: "Trabajo", color: "azul" }] }),
      task({ id: "solo-prioridad", priority: 1 }),
      task({ id: "solo-etiqueta", priority: 4, labels: [{ id: "l1", name: "Trabajo", color: "azul" }] }),
    ];
    const result = applyQuickFilters(tasks, { deadline: "cualquiera", priority: 1, labelId: "l1" }, true);
    expect(result.map((t) => t.id)).toEqual(["match"]);
  });

  it('"con fecha límite" solo deja las que tienen deadline', () => {
    const tasks = [task({ id: "con", deadline: "2026-08-01" }), task({ id: "sin" })];
    const result = applyQuickFilters(tasks, { deadline: "con", priority: null, labelId: null }, true);
    expect(result.map((t) => t.id)).toEqual(["con"]);
  });

  it('"sin fecha límite" solo deja las que no tienen deadline', () => {
    const tasks = [task({ id: "con", deadline: "2026-08-01" }), task({ id: "sin" })];
    const result = applyQuickFilters(tasks, { deadline: "sin", priority: null, labelId: null }, true);
    expect(result.map((t) => t.id)).toEqual(["sin"]);
  });
});
