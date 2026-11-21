import { describe, expect, it } from "vitest";
import { cascadeProjectToDescendants, fetchDescendants } from "./move-subtree";

type Row = Record<string, unknown>;

function fakeSupabase(tasks: Row[], updateError: Error | null = null) {
  function builder() {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    const api = {
      select: () => api,
      update: (p: Row) => {
        patch = p;
        return api;
      },
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
      then: (resolve: (v: { data: Row[] | null; error: Error | null }) => void) => {
        if (patch) {
          if (updateError) return resolve({ data: null, error: updateError });
          for (const row of tasks) if (filters.every((f) => f(row))) Object.assign(row, patch);
          return resolve({ data: null, error: null });
        }
        resolve({ data: tasks.filter((row) => filters.every((f) => f(row))), error: null });
      },
    };
    return api;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: () => builder() } as any;
}

describe("fetchDescendants", () => {
  it("devuelve solo los descendientes, de todos los niveles, sin la raíz", async () => {
    const supabase = fakeSupabase([
      { id: "a", parent_id: null, project_id: "p1", section_id: "s1" },
      { id: "b", parent_id: "a", project_id: "p1", section_id: "s2" },
      { id: "c", parent_id: "b", project_id: "p1", section_id: null },
      { id: "x", parent_id: null, project_id: "p1", section_id: null },
    ]);

    const result = await fetchDescendants(supabase, "a");

    expect(result.map((t) => t.id).sort()).toEqual(["b", "c"]);
    expect(result.find((t) => t.id === "b")).toEqual({ id: "b", parent_id: "a", project_id: "p1", section_id: "s2" });
  });
});

describe("cascadeProjectToDescendants", () => {
  it("lleva los descendientes al proyecto destino y les quita la sección", async () => {
    const tasks = [
      { id: "b", project_id: "p1", section_id: "s1" },
      { id: "c", project_id: "p1", section_id: "s2" },
      { id: "x", project_id: "p1", section_id: "s3" },
    ];

    await cascadeProjectToDescendants(fakeSupabase(tasks), ["b", "c"], "p2");

    expect(tasks).toEqual([
      { id: "b", project_id: "p2", section_id: null },
      { id: "c", project_id: "p2", section_id: null },
      { id: "x", project_id: "p1", section_id: "s3" },
    ]);
  });

  it("con una lista vacía no llama a la base", async () => {
    const supabase = { from: () => { throw new Error("no debería llamarse"); } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(cascadeProjectToDescendants(supabase as any, [], "p2")).resolves.toBeUndefined();
  });

  it("lanza el error de la base", async () => {
    await expect(cascadeProjectToDescendants(fakeSupabase([], new Error("rechazado")), ["b"], "p2")).rejects.toThrow(
      "rechazado",
    );
  });
});
