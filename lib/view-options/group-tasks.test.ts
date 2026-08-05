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

  it('"sección" arma bloques colapsables que solo SectionedTasks sabe montar, nunca este camino genérico: se trata como "nada" (D-C, lista-con-mas-agrupadores)', () => {
    const tasks = [task({ id: "a" }), task({ id: "b" })];
    expect(groupTasks(tasks, "seccion")).toEqual(groupTasks(tasks, "nada"));
  });

  it('"fecha" arma un grupo por día de vencimiento, en orden cronológico, más "Sin fecha" al final (D-D, lista-con-mas-agrupadores)', () => {
    const tasks = [
      task({ id: "later", due_date: "2026-08-20" }),
      task({ id: "sooner", due_date: "2026-08-10" }),
      task({ id: "undated" }),
    ];
    const groups = groupTasks(tasks, "fecha", "America/Argentina/Buenos_Aires");
    expect(groups.map((g) => g.tasks.map((t) => t.id))).toEqual([["sooner"], ["later"], ["undated"]]);
    expect(groups[groups.length - 1].label).toBe("Sin fecha");
  });

  it('"fecha" no muestra un grupo vacío de "Sin fecha" cuando todas las tareas tienen fecha (sin grupos vacíos, mismo criterio que prioridad/etiqueta)', () => {
    const tasks = [task({ id: "a", due_date: "2026-08-10" })];
    const groups = groupTasks(tasks, "fecha", "America/Argentina/Buenos_Aires");
    expect(groups.every((g) => g.label !== "Sin fecha")).toBe(true);
  });

  it('sin "timezone", "fecha" bucketea en UTC por default', () => {
    const tasks = [task({ id: "a", due_date: "2026-08-10" })];
    expect(groupTasks(tasks, "fecha")).toEqual(groupTasks(tasks, "fecha", "UTC"));
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
