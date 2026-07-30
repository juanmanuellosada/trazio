import { describe, expect, it } from "vitest";
import { restoreTaskSnapshot, snapshotTaskSubtree } from "./restore";

/**
 * Fake mínimo de `SupabaseClient` acotado a lo que `restore.ts` usa
 * (`select`/`eq`/`in`/`insert`, sin `.single()` en las consultas por
 * `in`): un `Map` de tablas en memoria, con filtros que se acumulan hasta
 * que la cadena se resuelve (por `await` directo o por `.single()`).
 */
type Row = Record<string, unknown>;

function fakeSupabase(tables: Record<string, Row[]>) {
  function builder(table: string) {
    const store = tables[table] ?? (tables[table] = []);
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
        const [match] = store.filter((row) => filters.every((f) => f(row)));
        return match ? { data: match, error: null } : { data: null, error: { message: "no encontrado" } };
      },
      insert: (payload: Row | Row[]) => {
        const rows = Array.isArray(payload) ? payload : [payload];
        store.push(...rows.map((r) => ({ ...r })));
        return { then: (resolve: (v: { error: null }) => void) => resolve({ error: null }) };
      },
      then: (resolve: (v: { data: Row[]; error: null }) => void) => {
        resolve({ data: store.filter((row) => filters.every((f) => f(row))), error: null });
      },
    };
    return api;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: (table: string) => builder(table) } as any;
}

describe("snapshotTaskSubtree / restoreTaskSnapshot (requirement \"Restaurar una tarea eliminada restaura sus subtareas, sus etiquetas y sus comentarios\")", () => {
  it("restaurar una tarea con subtareas, etiquetas y comentarios devuelve todo", async () => {
    const root = { id: "t1", parent_id: null, title: "Raíz" };
    const child = { id: "t2", parent_id: "t1", title: "Subtarea" };
    const tables: Record<string, Row[]> = {
      tasks: [root, child],
      task_labels: [
        { task_id: "t1", label_id: "l1", user_id: "u1" },
        { task_id: "t2", label_id: "l2", user_id: "u1" },
      ],
      comments: [{ id: "c1", task_id: "t1", user_id: "u1", content: { texto: "hola" }, created_at: "a", updated_at: "a" }],
    };
    const supabase = fakeSupabase(tables);

    const snapshot = await snapshotTaskSubtree(supabase, "t1");
    expect(snapshot.tasks.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
    expect(snapshot.labelLinks).toHaveLength(2);
    expect(snapshot.comments).toHaveLength(1);

    // Simula el borrado real: las filas ya no están en la base.
    tables.tasks = [];
    tables.task_labels = [];
    tables.comments = [];
    const supabaseAfterDelete = fakeSupabase(tables);

    await restoreTaskSnapshot(supabaseAfterDelete, snapshot);

    expect(tables.tasks.map((t) => t.id).sort()).toEqual(["t1", "t2"]);
    expect(tables.task_labels).toHaveLength(2);
    expect(tables.comments).toHaveLength(1);
    expect(tables.comments[0].content).toEqual({ texto: "hola" });
  });

  it("una tarea sin comentarios ni etiquetas restaura igual, sin insertar filas vacías", async () => {
    const tables: Record<string, Row[]> = {
      tasks: [{ id: "t1", parent_id: null, title: "Sola" }],
      task_labels: [],
      comments: [],
    };
    const supabase = fakeSupabase(tables);
    const snapshot = await snapshotTaskSubtree(supabase, "t1");

    tables.tasks = [];
    const supabaseAfterDelete = fakeSupabase(tables);
    await restoreTaskSnapshot(supabaseAfterDelete, snapshot);

    expect(tables.tasks).toHaveLength(1);
    expect(tables.task_labels).toHaveLength(0);
    expect(tables.comments).toHaveLength(0);
  });
});
