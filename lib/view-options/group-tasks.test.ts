import { describe, expect, it } from "vitest";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { groupTasks } from "./group-tasks";

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

describe("groupTasks (bloque 6.6, requirement Agrupar por)", () => {
  it('"nada" devuelve un único grupo con todas las tareas', () => {
    const tasks = [task({ id: "a" }), task({ id: "b" })];
    const groups = groupTasks(tasks, "nada");
    expect(groups).toHaveLength(1);
    expect(groups[0].tasks.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it('"sección" y "fecha" son valores del panel que la lista no sabe agrupar: se tratan como "nada" (espejo de D-B, hueco de panel-con-columnas-por-campo)', () => {
    const tasks = [task({ id: "a" }), task({ id: "b" })];
    expect(groupTasks(tasks, "seccion")).toEqual(groupTasks(tasks, "nada"));
    expect(groupTasks(tasks, "fecha")).toEqual(groupTasks(tasks, "nada"));
  });

  it('"prioridad" arma un grupo por cada prioridad presente, sin grupos vacíos', () => {
    const tasks = [task({ id: "urgente", priority: 1 }), task({ id: "baja", priority: 4 })];
    const groups = groupTasks(tasks, "prioridad");
    expect(groups.map((g) => g.tasks.map((t) => t.id))).toEqual([["urgente"], ["baja"]]);
  });

  it('"etiqueta" agrupa por cada etiqueta asignada y deja las sin etiqueta aparte, al final', () => {
    const tasks = [
      task({ id: "trabajo", labels: [{ id: "l1", name: "Trabajo", color: "azul" }] }),
      task({ id: "sin-etiqueta" }),
      task({ id: "casa", labels: [{ id: "l2", name: "Casa", color: "verde" }] }),
    ];
    const groups = groupTasks(tasks, "etiqueta");
    expect(groups.map((g) => g.label)).toEqual(["Casa", "Trabajo", "Sin etiqueta"]);
    expect(groups.find((g) => g.label === "Sin etiqueta")?.tasks.map((t) => t.id)).toEqual(["sin-etiqueta"]);
  });

  it("una tarea con dos etiquetas aparece en los dos grupos", () => {
    const tasks = [
      task({
        id: "doble",
        labels: [
          { id: "l1", name: "Trabajo", color: "azul" },
          { id: "l2", name: "Casa", color: "verde" },
        ],
      }),
    ];
    const groups = groupTasks(tasks, "etiqueta");
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.tasks.map((t) => t.id).includes("doble"))).toBe(true);
  });
});
