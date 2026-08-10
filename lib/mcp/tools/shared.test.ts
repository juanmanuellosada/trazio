import { describe, expect, it } from "vitest";
import { toMcpTaskItem, type RawTaskRow } from "./shared";

function baseRow(overrides: Partial<RawTaskRow> = {}): RawTaskRow {
  return {
    id: "task-1",
    project_id: "project-1",
    section_id: null,
    parent_id: null,
    title: "Pagar el alquiler",
    description: null,
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 1000,
    task_labels: null,
    ...overrides,
  };
}

describe("toMcpTaskItem", () => {
  it("una descripción null queda en null, no en un string vacío", () => {
    const item = toMcpTaskItem(baseRow({ description: null }));
    expect(item.description).toBeNull();
  });

  it("convierte el jsonb de Tiptap a texto legible", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hola" }] }] };
    const item = toMcpTaskItem(baseRow({ description: doc }));
    expect(item.description).toBe("hola");
  });

  it("un doc vacío también queda en null (mismo criterio que 'sin descripción')", () => {
    const item = toMcpTaskItem(baseRow({ description: { type: "doc", content: [] } }));
    expect(item.description).toBeNull();
  });

  it("sin task_labels, labels es un array vacío", () => {
    const item = toMcpTaskItem(baseRow({ task_labels: null }));
    expect(item.labels).toEqual([]);
  });

  it("descarta joins de task_labels cuya etiqueta vino null", () => {
    const item = toMcpTaskItem(
      baseRow({
        task_labels: [
          { labels: { id: "l1", name: "Urgente", color: "rojo" } },
          { labels: null },
        ],
      }),
    );
    expect(item.labels).toEqual([{ id: "l1", name: "Urgente", color: "rojo" }]);
  });

  it("nunca deja pasar el jsonb crudo de Tiptap: el resultado siempre tiene description como string o null", () => {
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x" }] }] };
    const item = toMcpTaskItem(baseRow({ description: doc }));
    expect(typeof item.description === "string" || item.description === null).toBe(true);
  });
});
