import { describe, expect, it } from "vitest";
import { duplicateTaskTree } from "./duplicate";

/**
 * Fake mínimo de `SupabaseClient`, acotado a lo que `duplicateTaskTree`
 * usa sobre `tasks` (`select`/`eq`/`in`/`single`, `insert`/`select`/
 * `single`): mismo patrón que `restore.test.ts`, pero con el `insert`
 * devolviendo un id generado, como hace Postgres de verdad.
 */
type Row = Record<string, unknown>;

function fakeSupabase(tasks: Row[]) {
  let nextId = 1;

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
      insert: (payload: Row) => {
        const row = { id: `nueva-${nextId++}`, ...payload };
        tasks.push(row);
        return {
          select: () => ({
            single: async () => ({ data: { id: row.id }, error: null }),
          }),
        };
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

describe("duplicateTaskTree con projectId/sectionId (duplicar-un-proyecto)", () => {
  it("sin options, se comporta como el duplicado de una sola tarea: mismo proyecto y sección", async () => {
    const root = { id: "t1", user_id: "u1", project_id: "p1", section_id: "s1", parent_id: null, title: "Raíz", position: 1000 };
    const tasks = [root];

    const newId = await duplicateTaskTree(fakeSupabase(tasks), "t1", 1500);

    const copy = tasks.find((t) => t.id === newId)!;
    expect(copy.project_id).toBe("p1");
    expect(copy.section_id).toBe("s1");
  });

  it("con options, la raíz cae en el proyecto y la sección nuevos, y los descendientes en el proyecto nuevo sin sección", async () => {
    const root = { id: "t1", user_id: "u1", project_id: "p1", section_id: "s1", parent_id: null, title: "Raíz", position: 1000 };
    const child = { id: "t2", user_id: "u1", project_id: "p1", section_id: "s1", parent_id: "t1", title: "Subtarea", position: 1000 };
    const tasks = [root, child];
    const copied: Array<[string, string]> = [];

    const newRootId = await duplicateTaskTree(fakeSupabase(tasks), "t1", 1500, {
      projectId: "p2",
      sectionId: "s2",
      onCopied: (oldId, newId) => copied.push([oldId, newId]),
    });

    const newRoot = tasks.find((t) => t.id === newRootId)!;
    expect(newRoot.project_id).toBe("p2");
    expect(newRoot.section_id).toBe("s2");

    const newChild = tasks.find((t) => t.parent_id === newRootId)!;
    expect(newChild.project_id).toBe("p2");
    expect(newChild.section_id).toBeNull();

    expect(copied).toEqual([
      ["t1", newRootId],
      ["t2", newChild.id],
    ]);
  });

  it("sectionId ausente en las options deja la raíz sin sección", async () => {
    const root = { id: "t1", user_id: "u1", project_id: "p1", section_id: "s1", parent_id: null, title: "Raíz", position: 1000 };
    const tasks = [root];

    const newRootId = await duplicateTaskTree(fakeSupabase(tasks), "t1", 1500, { projectId: "p2" });

    const newRoot = tasks.find((t) => t.id === newRootId)!;
    expect(newRoot.section_id).toBeNull();
  });
});
