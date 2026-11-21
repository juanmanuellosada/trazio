import { describe, expect, it } from "vitest";
import { replaceTaskLabels } from "./replace-labels";

type Row = Record<string, unknown>;
type Failures = { insert?: Error; delete?: Error; select?: Error };

/** Fake de `task_labels`: `select().eq()`, `insert()` y `delete().eq().in()` sobre un arreglo en memoria. */
function fakeSupabase(rows: Row[], failures: Failures = {}) {
  function builder() {
    const filters: Array<(row: Row) => boolean> = [];
    let mode: "select" | "delete" = "select";
    const api = {
      select: () => api,
      delete: () => {
        mode = "delete";
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
      insert: async (payload: Row | Row[]) => {
        if (failures.insert) return { error: failures.insert };
        rows.push(...(Array.isArray(payload) ? payload : [payload]));
        return { error: null };
      },
      then: (resolve: (v: { data: Row[] | null; error: Error | null }) => void) => {
        if (mode === "delete") {
          if (failures.delete) return resolve({ data: null, error: failures.delete });
          for (let i = rows.length - 1; i >= 0; i--) if (filters.every((f) => f(rows[i]))) rows.splice(i, 1);
          return resolve({ data: null, error: null });
        }
        if (failures.select) return resolve({ data: null, error: failures.select });
        resolve({ data: rows.filter((row) => filters.every((f) => f(row))), error: null });
      },
    };
    return api;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: () => builder() } as any;
}

const labelsOf = (rows: Row[], taskId: string) => rows.filter((r) => r.task_id === taskId).map((r) => r.label_id).sort();

describe("replaceTaskLabels (requirement \"Reemplazar las etiquetas nunca quita las que se conservan\")", () => {
  it("reemplazo sin fallas: la tarea queda con exactamente el conjunto nuevo", async () => {
    const rows = [
      { task_id: "t1", label_id: "compras", user_id: "u1" },
      { task_id: "t1", label_id: "urgente", user_id: "u1" },
      { task_id: "t2", label_id: "urgente", user_id: "u1" },
    ];

    await replaceTaskLabels(fakeSupabase(rows), "t1", ["compras", "casa"], "u1");

    expect(labelsOf(rows, "t1")).toEqual(["casa", "compras"]);
    expect(labelsOf(rows, "t2")).toEqual(["urgente"]);
  });

  it("falla la asignación de una etiqueta nueva: la tarea conserva todas las que tenía", async () => {
    const rows = [
      { task_id: "t1", label_id: "compras", user_id: "u1" },
      { task_id: "t1", label_id: "urgente", user_id: "u1" },
    ];

    await expect(
      replaceTaskLabels(fakeSupabase(rows, { insert: new Error("rechazado") }), "t1", ["compras", "casa"], "u1"),
    ).rejects.toThrow("rechazado");

    expect(labelsOf(rows, "t1")).toEqual(["compras", "urgente"]);
  });

  it("falla el borrado de las que sobran: no se pierde ninguna de las que se conservan y lanza el error", async () => {
    const rows = [
      { task_id: "t1", label_id: "compras", user_id: "u1" },
      { task_id: "t1", label_id: "urgente", user_id: "u1" },
    ];

    await expect(
      replaceTaskLabels(fakeSupabase(rows, { delete: new Error("rechazado") }), "t1", ["compras", "casa"], "u1"),
    ).rejects.toThrow("rechazado");

    expect(labelsOf(rows, "t1")).toEqual(["casa", "compras", "urgente"]);
  });

  it("un conjunto vacío quita todas las etiquetas sin insertar nada", async () => {
    const rows = [{ task_id: "t1", label_id: "compras", user_id: "u1" }];

    await replaceTaskLabels(fakeSupabase(rows), "t1", [], "u1");

    expect(rows).toEqual([]);
  });

  it("lanza si falla la lectura de las asignaciones actuales", async () => {
    await expect(replaceTaskLabels(fakeSupabase([], { select: new Error("sin lectura") }), "t1", ["a"], "u1")).rejects.toThrow(
      "sin lectura",
    );
  });
});
