import { describe, expect, it } from "vitest";
import { resolveDragEnd } from "./resolve-drag-end";
import type { BoardColumn } from "./board";
import type { TaskRow } from "@/lib/tasks/use-tasks";

function task(id: string, position: number): TaskRow {
  return {
    id,
    project_id: "p1",
    section_id: null,
    parent_id: null,
    title: id,
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position,
    labels: [],
  };
}

function columns(): BoardColumn[] {
  return [
    { id: "col-a", title: "A", tasks: [task("t1", 1000), task("t2", 2000)] },
    { id: "col-b", title: "B", tasks: [task("t3", 1000)] },
    { id: "col-c", title: "C", tasks: [] },
  ];
}

describe("resolveDragEnd — reordenar dentro de la misma columna", () => {
  it("calcula la posición intermedia al soltar sobre otra tarjeta de la misma columna", () => {
    const action = resolveDragEnd(columns(), "t1", "t2");
    expect(action).toEqual({ type: "reorder", columnId: "col-a", taskId: "t1", position: expect.any(Number) });
  });

  it("no hace nada si se suelta sobre sí misma", () => {
    expect(resolveDragEnd(columns(), "t1", "t1")).toBeNull();
  });
});

describe("resolveDragEnd — mover entre columnas", () => {
  it("mueve al soltar sobre la zona vacía de otra columna (prefijo de columna)", () => {
    const action = resolveDragEnd(columns(), "t1", "board-column:col-b");
    expect(action).toEqual({ type: "move", taskId: "t1", fromColumnId: "col-a", toColumnId: "col-b" });
  });

  it("mueve al soltar sobre una tarjeta de otra columna", () => {
    const action = resolveDragEnd(columns(), "t1", "t3");
    expect(action).toEqual({ type: "move", taskId: "t1", fromColumnId: "col-a", toColumnId: "col-b" });
  });

  it("mueve a una columna vacía", () => {
    const action = resolveDragEnd(columns(), "t1", "board-column:col-c");
    expect(action).toEqual({ type: "move", taskId: "t1", fromColumnId: "col-a", toColumnId: "col-c" });
  });
});

describe("resolveDragEnd — casos sin acción", () => {
  it("sin `over` (soltó afuera de cualquier zona), no hace nada", () => {
    expect(resolveDragEnd(columns(), "t1", null)).toBeNull();
  });

  it("la tarjeta activa no está en ninguna columna conocida", () => {
    expect(resolveDragEnd(columns(), "fantasma", "t1")).toBeNull();
  });

  it("el destino no es ni una tarjeta ni una columna conocida", () => {
    expect(resolveDragEnd(columns(), "t1", "board-column:col-inexistente")).toBeNull();
  });
});
