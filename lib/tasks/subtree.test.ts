import { describe, expect, it } from "vitest";
import { fetchTaskSubtree } from "./subtree";

type Row = Record<string, unknown>;

function fakeSupabase(tasks: Row[]) {
  function builder() {
    const filters: Array<(row: Row) => boolean> = [];
    const api = {
      select: () => api,
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return api;
      },
      in: (col: string, vals: unknown[]) => {
        filters.push((row) => vals.includes(row[col]));
        return api;
      },
      single: async () => {
        const [match] = tasks.filter((row) => filters.every((f) => f(row)));
        return match ? { data: match, error: null } : { data: null, error: { message: "no encontrado" } };
      },
      then: (resolve: (v: { data: Row[]; error: null }) => void) => {
        resolve({ data: tasks.filter((row) => filters.every((f) => f(row))), error: null });
      },
    };
    return api;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: () => builder() } as any;
}

describe("fetchTaskSubtree (requirement \"El recorrido de un subárbol termina siempre\")", () => {
  it("un ciclo guardado no cuelga el recorrido y cada tarea aparece una sola vez", async () => {
    const supabase = fakeSupabase([
      { id: "a", parent_id: "b" },
      { id: "b", parent_id: "a" },
    ]);

    const result = await fetchTaskSubtree<{ id: string; parent_id: string | null }>(supabase, "a", "id, parent_id");

    expect(result.map((t) => t.id).sort()).toEqual(["a", "b"]);
  });

  it("un árbol normal devuelve la raíz y todos sus niveles", async () => {
    const supabase = fakeSupabase([
      { id: "a", parent_id: null },
      { id: "b", parent_id: "a" },
      { id: "c", parent_id: "b" },
    ]);

    const result = await fetchTaskSubtree<{ id: string; parent_id: string | null }>(supabase, "a", "id, parent_id");

    expect(result.map((t) => t.id)).toEqual(["a", "b", "c"]);
  });
});
