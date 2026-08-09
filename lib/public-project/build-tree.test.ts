import { describe, expect, it } from "vitest";
import { topLevelTasksForSection } from "./build-tree";
import type { SharedTask } from "./types";

function task(overrides: Partial<SharedTask> & { id: string }): SharedTask {
  return {
    section_id: null,
    parent_id: null,
    title: "Tarea",
    description: null,
    due_date: null,
    due_at: null,
    deadline: null,
    priority: 4,
    completed: false,
    ...overrides,
  };
}

describe("topLevelTasksForSection", () => {
  it("agrupa las tareas sin sección aparte de las de una sección puntual", () => {
    const unsectioned = task({ id: "u1" });
    const sectioned = task({ id: "s1", section_id: "sec-1" });
    const tasks = [unsectioned, sectioned];

    expect(topLevelTasksForSection(tasks, null).map((t) => t.id)).toEqual(["u1"]);
    expect(topLevelTasksForSection(tasks, "sec-1").map((t) => t.id)).toEqual(["s1"]);
  });

  it("anida las subtareas bajo su padre, sin límite de niveles", () => {
    const top = task({ id: "top" });
    const child = task({ id: "child", parent_id: "top" });
    const grandchild = task({ id: "grandchild", parent_id: "child" });
    const tasks = [top, child, grandchild];

    const [topNode] = topLevelTasksForSection(tasks, null);
    expect(topNode.subtasks).toHaveLength(1);
    expect(topNode.subtasks[0].id).toBe("child");
    expect(topNode.subtasks[0].subtasks).toHaveLength(1);
    expect(topNode.subtasks[0].subtasks[0].id).toBe("grandchild");
  });

  it("no incluye subtareas como si fueran de nivel superior", () => {
    const top = task({ id: "top" });
    const child = task({ id: "child", parent_id: "top" });
    const tasks = [top, child];

    const topLevel = topLevelTasksForSection(tasks, null);
    expect(topLevel.map((t) => t.id)).toEqual(["top"]);
  });

  it("preserva el orden ya resuelto por get_shared_project, sin reordenar", () => {
    const first = task({ id: "first" });
    const second = task({ id: "second" });
    const tasks = [second, first];

    expect(topLevelTasksForSection(tasks, null).map((t) => t.id)).toEqual(["second", "first"]);
  });
});
