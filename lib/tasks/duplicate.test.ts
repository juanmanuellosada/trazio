import { describe, expect, it } from "vitest";
import { duplicateTaskTree } from "./duplicate";

/**
 * Fake mínimo de `SupabaseClient`, acotado a lo que `duplicateTaskTree`
 * usa sobre `tasks` (`select`/`eq`/`in`/`single`, `insert`/`select`/
 * `single`): mismo patrón que `restore.test.ts`, pero con el `insert`
 * devolviendo un id generado, como hace Postgres de verdad.
 */
type Row = Record<string, unknown>;

type Failures = { labelsSelect?: Error; labelsInsert?: Error; tasksDelete?: Error };

function fakeSupabase(tasks: Row[], taskLabels: Row[] = [], failures: Failures = {}) {
  let nextId = 1;

  function builder(table: string) {
    const store = table === "task_labels" ? taskLabels : tasks;
    const filters: Array<(row: Row) => boolean> = [];
    const api = {
      select: () => api,
      // Borrado con cascada por `parent_id`, como `on delete cascade`.
      delete: () => ({
        eq: async (_col: string, id: unknown) => {
          if (failures.tasksDelete) throw failures.tasksDelete;
          const doomed = new Set<unknown>([id]);
          let grew = true;
          while (grew) {
            grew = false;
            for (const row of tasks) {
              if (!doomed.has(row.id) && doomed.has(row.parent_id)) {
                doomed.add(row.id);
                grew = true;
              }
            }
          }
          for (let i = tasks.length - 1; i >= 0; i--) if (doomed.has(tasks[i].id)) tasks.splice(i, 1);
          return { error: null };
        },
      }),
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return api;
      },
      in: (col: string, vals: unknown[]) => {
        filters.push((row) => vals.includes(row[col]));
        return api;
      },
      single: async () => {
        const [match] = store.filter((row) => filters.every((f) => f(row)));
        return match ? { data: match, error: null } : { data: null, error: { message: "no encontrado" } };
      },
      insert: (payload: Row | Row[]) => {
        if (table === "task_labels") {
          if (failures.labelsInsert) {
            const error = failures.labelsInsert;
            return { then: (resolve: (v: { error: Error }) => void) => resolve({ error }) };
          }
          taskLabels.push(...(Array.isArray(payload) ? payload : [payload]));
          return { then: (resolve: (v: { error: null }) => void) => resolve({ error: null }) };
        }
        const row = { id: `nueva-${nextId++}`, ...(payload as Row) };
        tasks.push(row);
        return {
          select: () => ({
            single: async () => ({ data: { id: row.id }, error: null }),
          }),
        };
      },
      then: (resolve: (v: { data: Row[] | null; error: Error | null }) => void) => {
        if (table === "task_labels" && failures.labelsSelect) {
          resolve({ data: null, error: failures.labelsSelect });
          return;
        }
        resolve({ data: store.filter((row) => filters.every((f) => f(row))), error: null });
      },
    };
    return api;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: (table: string) => builder(table) } as any;
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

    const newRootId = await duplicateTaskTree(fakeSupabase(tasks), "t1", 1500, {
      projectId: "p2",
      sectionId: "s2",
    });

    const newRoot = tasks.find((t) => t.id === newRootId)!;
    expect(newRoot.project_id).toBe("p2");
    expect(newRoot.section_id).toBe("s2");

    const newChild = tasks.find((t) => t.parent_id === newRootId)!;
    expect(newChild.project_id).toBe("p2");
    expect(newChild.section_id).toBeNull();
  });

  it("sectionId ausente en las options deja la raíz sin sección", async () => {
    const root = { id: "t1", user_id: "u1", project_id: "p1", section_id: "s1", parent_id: null, title: "Raíz", position: 1000 };
    const tasks = [root];

    const newRootId = await duplicateTaskTree(fakeSupabase(tasks), "t1", 1500, { projectId: "p2" });

    const newRoot = tasks.find((t) => t.id === newRootId)!;
    expect(newRoot.section_id).toBeNull();
  });
});

describe("duplicateTaskTree copia las etiquetas", () => {
  it("la raíz y cada subtarea conservan sus etiquetas, sin pasar options", async () => {
    const root = { id: "t1", user_id: "u1", project_id: "p1", section_id: "s1", parent_id: null, title: "Raíz", position: 1000 };
    const child = { id: "t2", user_id: "u1", project_id: "p1", section_id: null, parent_id: "t1", title: "Subtarea", position: 1000 };
    const otra = { id: "t3", user_id: "u1", project_id: "p1", section_id: null, parent_id: null, title: "Otra", position: 2000 };
    const tasks = [root, child, otra];
    const labels: Row[] = [
      { task_id: "t1", label_id: "lA", user_id: "u1" },
      { task_id: "t1", label_id: "lB", user_id: "u1" },
      { task_id: "t2", label_id: "lC", user_id: "u1" },
      { task_id: "t3", label_id: "lD", user_id: "u1" },
    ];

    const newRootId = await duplicateTaskTree(fakeSupabase(tasks, labels), "t1", 1500);

    const newChild = tasks.find((t) => t.parent_id === newRootId)!;
    expect(tasks.find((t) => t.id === newRootId)!.section_id).toBe("s1");
    const copias = labels.filter((l) => l.task_id !== "t1" && l.task_id !== "t2" && l.task_id !== "t3");
    expect(copias.filter((l) => l.task_id === newRootId).map((l) => l.label_id).sort()).toEqual(["lA", "lB"]);
    expect(copias.filter((l) => l.task_id === newChild.id).map((l) => l.label_id)).toEqual(["lC"]);
    expect(copias.every((l) => l.user_id === "u1")).toBe(true);
    expect(copias).toHaveLength(3);
  });

  it("con projectId y sectionId (camino de duplicar un proyecto), las etiquetas caen en las copias de la raíz y la subtarea", async () => {
    const root = { id: "t1", user_id: "u1", project_id: "p1", section_id: "s1", parent_id: null, title: "Raíz", position: 1000 };
    const child = { id: "t2", user_id: "u1", project_id: "p1", section_id: null, parent_id: "t1", title: "Subtarea", position: 1000 };
    const tasks = [root, child];
    const labels: Row[] = [
      { task_id: "t1", label_id: "lA", user_id: "u1" },
      { task_id: "t2", label_id: "lC", user_id: "u1" },
    ];

    const newRootId = await duplicateTaskTree(fakeSupabase(tasks, labels), "t1", 1500, {
      projectId: "p2",
      sectionId: "s2",
    });

    const newChild = tasks.find((t) => t.parent_id === newRootId)!;
    expect(newChild.project_id).toBe("p2");
    const copias = labels.filter((l) => l.task_id !== "t1" && l.task_id !== "t2");
    expect(copias.filter((l) => l.task_id === newRootId).map((l) => l.label_id)).toEqual(["lA"]);
    expect(copias.filter((l) => l.task_id === newChild.id).map((l) => l.label_id)).toEqual(["lC"]);
    expect(copias).toHaveLength(2);
  });

  it("una tarea sin etiquetas no inserta nada en task_labels", async () => {
    const root = { id: "t1", user_id: "u1", project_id: "p1", section_id: null, parent_id: null, title: "Raíz", position: 1000 };
    const labels: Row[] = [];

    await duplicateTaskTree(fakeSupabase([root], labels), "t1", 1500);

    expect(labels).toHaveLength(0);
  });
});

describe("duplicateTaskTree cuando falla la copia de etiquetas", () => {
  const originales = () => [
    { id: "t1", user_id: "u1", project_id: "p1", section_id: null, parent_id: null, title: "Raíz", position: 1000 },
    { id: "t2", user_id: "u1", project_id: "p1", section_id: null, parent_id: "t1", title: "Subtarea", position: 1000 },
  ];
  const etiquetas = (): Row[] => [{ task_id: "t1", label_id: "lA", user_id: "u1" }];

  it("si falla la lectura de etiquetas, rechaza con el error original y no queda ninguna copia", async () => {
    const tasks = originales();
    const original = new Error("falla select task_labels");

    await expect(
      duplicateTaskTree(fakeSupabase(tasks, etiquetas(), { labelsSelect: original }), "t1", 1500),
    ).rejects.toBe(original);

    expect(tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("si falla la inserción de etiquetas, rechaza con el error original y no queda ninguna copia", async () => {
    const tasks = originales();
    const labels = etiquetas();
    const original = new Error("falla insert task_labels");

    await expect(
      duplicateTaskTree(fakeSupabase(tasks, labels, { labelsInsert: original }), "t1", 1500),
    ).rejects.toBe(original);

    expect(tasks.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(labels).toHaveLength(1);
  });

  it("si además falla el borrado compensatorio, igual rechaza con el error original", async () => {
    const original = new Error("falla insert task_labels");

    await expect(
      duplicateTaskTree(
        fakeSupabase(originales(), etiquetas(), { labelsInsert: original, tasksDelete: new Error("falla delete") }),
        "t1",
        1500,
      ),
    ).rejects.toBe(original);
  });
});
