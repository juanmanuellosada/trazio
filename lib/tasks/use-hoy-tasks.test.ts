import { describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { fetchHoyTasks } from "./use-hoy-tasks";
import type { TaskListRawRow } from "./use-tasks";

function rawTask(overrides: Partial<TaskListRawRow> & { id: string }): TaskListRawRow {
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
    task_labels: [],
    ...overrides,
  };
}

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

/**
 * Mock mínimo de la consulta encadenada `.select().eq().or()`: alcanza para
 * `fetchHoyTasks`, que no llama `.order()` (D25: el orden lo pone
 * `compareHoyTasks` en memoria, no la base).
 */
function mockHoyQuery(data: TaskListRawRow[]) {
  const chain = {
    eq: vi.fn(() => chain),
    or: vi.fn(() => Promise.resolve({ data, error: null })),
  };
  (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockReturnValue({
    from: vi.fn(() => ({ select: vi.fn(() => chain) })),
  });
}

describe("fetchHoyTasks — orden (D25)", () => {
  it("devuelve las tareas ordenadas por compareHoyTasks, no en el orden crudo de la consulta", async () => {
    // Orden crudo deliberadamente "desordenado" respecto del resultado esperado.
    const todoElDiaVieja = rawTask({ id: "todo-el-dia-vieja", due_date: "2026-07-20" });
    const conHoraTemprano = rawTask({ id: "con-hora-temprano", due_at: "2026-07-26T09:00:00.000Z" });
    const conHoraTarde = rawTask({ id: "con-hora-tarde", due_at: "2026-07-26T18:00:00.000Z" });
    mockHoyQuery([todoElDiaVieja, conHoraTarde, conHoraTemprano]);

    const result = await fetchHoyTasks("user-1", "America/Argentina/Buenos_Aires");

    expect(result.map((t) => t.id)).toEqual(["con-hora-temprano", "con-hora-tarde", "todo-el-dia-vieja"]);
  });
});
