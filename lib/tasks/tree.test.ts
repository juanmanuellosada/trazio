import { describe, expect, it } from "vitest";
import { computeIndent, computeOutdent, positionAfterOriginal, siblingsOfTask } from "./tree";
import type { TaskRow } from "./use-tasks";

function task(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
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
    position: 1000,
    labels: [],
    ...overrides,
  };
}

// A, B, C de primer nivel (sin sección); B tiene una subtarea B1.
const A = task({ id: "A", position: 1000 });
const B = task({ id: "B", position: 2000 });
const B1 = task({ id: "B1", parent_id: "B", position: 1000 });
const C = task({ id: "C", position: 3000 });
const tasks = [A, B, B1, C];

describe("computeIndent (Tab, bloque 7)", () => {
  it("no hace nada con la primera tarea de su contexto: no hay hermano anterior", () => {
    expect(computeIndent(tasks, A)).toBeNull();
  });

  it("convierte la tarea en la última subtarea de su hermano anterior", () => {
    const result = computeIndent(tasks, B);
    expect(result).toEqual({ parentId: "A", sectionId: null, position: expect.any(Number) });
  });

  it("indenta después de las subtareas que ya tenga el hermano anterior", () => {
    // C indenta bajo B, que ya tiene a B1 como subtarea: la posición debe
    // quedar después de B1, no antes.
    const result = computeIndent(tasks, C);
    expect(result?.parentId).toBe("B");
    expect(result!.position).toBeGreaterThan(B1.position);
  });
});

describe("computeOutdent (Shift+Tab, bloque 7)", () => {
  it("no hace nada con una tarea de primer nivel: no tiene padre del cual salir", () => {
    expect(computeOutdent(tasks, A)).toBeNull();
  });

  it("promueve la subtarea a hermana de su padre, ubicada justo después", () => {
    const result = computeOutdent(tasks, B1);
    expect(result).toEqual({ parentId: null, sectionId: null, position: expect.any(Number) });
    // Debe quedar entre B (su ex padre) y C.
    expect(result!.position).toBeGreaterThan(B.position);
    expect(result!.position).toBeLessThan(C.position);
  });
});

describe("indentar y desindentar son inversos", () => {
  it("indentar B y después desindentarlo lo devuelve a nivel superior", () => {
    const indented = computeIndent(tasks, B)!;
    const bIndented: TaskRow = { ...B, parent_id: indented.parentId, section_id: indented.sectionId, position: indented.position };
    const afterIndent = [A, bIndented, B1, C];

    const outdented = computeOutdent(afterIndent, bIndented);
    expect(outdented?.parentId).toBeNull();
  });
});

describe("siblingsOfTask", () => {
  it("agrupa por parent_id cuando la tarea es una subtarea, ignorando la sección", () => {
    const siblings = siblingsOfTask(tasks, { projectId: "p1", sectionId: "otra-seccion", parentId: "B" });
    expect(siblings.map((t) => t.id)).toEqual(["B1"]);
  });

  it("agrupa por section_id cuando la tarea es de primer nivel", () => {
    const siblings = siblingsOfTask(tasks, { projectId: "p1", sectionId: null, parentId: null });
    expect(siblings.map((t) => t.id)).toEqual(["A", "B", "C"]);
  });
});

describe("positionAfterOriginal (duplicar, F2 del design)", () => {
  it("ubica la copia justo después de la original entre sus hermanos", () => {
    const position = positionAfterOriginal(tasks, B);
    expect(position).toBeGreaterThan(B.position);
    expect(position).toBeLessThan(C.position);
  });

  it("cuando la original es la última de su contexto, la copia queda después de todas", () => {
    const position = positionAfterOriginal(tasks, C);
    expect(position).toBeGreaterThan(C.position);
  });
});
