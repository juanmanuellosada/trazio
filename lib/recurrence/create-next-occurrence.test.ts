import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createNextRecurringOccurrence } from "./create-next-occurrence";

/**
 * Fake mínimo de `SupabaseClient`, mismo patrón que `lib/tasks/restore.test.ts`:
 * un `Map` de tablas en memoria. `select()` es un no-op (no filtra columnas
 * ni resuelve joins) — las filas de prueba ya traen `task_labels` embebido,
 * como lo devolvería PostgREST.
 */
type Row = Record<string, unknown>;

function fakeSupabase(tables: Record<string, Row[]>, failInsert: string[] = []) {
  let nextId = 0;
  function builder(table: string) {
    const store = tables[table] ?? (tables[table] = []);
    const filters: Array<(row: Row) => boolean> = [];
    const api = {
      select: () => api,
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return api;
      },
      is: (col: string, val: unknown) => {
        filters.push((row) => (row[col] ?? null) === val);
        return api;
      },
      neq: (col: string, val: unknown) => {
        filters.push((row) => row[col] !== val);
        return api;
      },
      limit: () => api,
      then: (resolve: (v: { data: Row[]; error: null }) => void) =>
        resolve({ data: store.filter((row) => filters.every((f) => f(row))), error: null }),
      single: async () => {
        const [match] = store.filter((row) => filters.every((f) => f(row)));
        return match ? { data: match, error: null } : { data: null, error: null };
      },
      insert: (payload: Row | Row[]) => {
        if (failInsert.includes(table)) {
          const failed = { error: { message: "rechazado" } };
          return { select: () => ({ single: async () => ({ data: null, ...failed }) }), then: (r: (v: typeof failed) => void) => r(failed) };
        }
        const rows = Array.isArray(payload) ? payload : [payload];
        const inserted = rows.map((r) => ({ id: `new-${++nextId}`, updated_at: "2026-08-07T00:00:00.000Z", ...r }));
        store.push(...inserted);
        return {
          select: () => ({ single: async () => ({ data: inserted[0], error: null }) }),
          then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
        };
      },
    };
    return api;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from: (table: string) => builder(table) } as any as SupabaseClient;
}

function baseTaskRow(overrides: Row = {}): Row {
  return {
    id: "t1",
    user_id: "u1",
    project_id: "p1",
    section_id: null,
    parent_id: null,
    title: "Regar las plantas",
    description: null,
    priority: 4,
    due_date: "2026-08-07",
    due_at: null,
    duration_minutes: null,
    deadline: null,
    recurrence_rule: "FREQ=DAILY;INTERVAL=3",
    recurrence_ends_at: null,
    recurrence_count: null,
    recurrence_anchor: null,
    position: 0,
    task_labels: [],
    ...overrides,
  };
}

const NOW = new Date("2026-08-07T12:00:00.000Z");

describe('createNextRecurringOccurrence (requirement "Generar la siguiente ocurrencia al completar una tarea recurrente")', () => {
  it("una subtarea recurrente crea la siguiente instancia bajo el mismo padre (parent_id)", async () => {
    const tables: Record<string, Row[]> = {
      tasks: [baseTaskRow({ parent_id: "padre1" })],
      user_preferences: [{ user_id: "u1", timezone: "America/Argentina/Buenos_Aires" }],
      task_labels: [],
    };
    const supabase = fakeSupabase(tables);

    const result = await createNextRecurringOccurrence(supabase, "t1", NOW);

    expect(result).not.toBeNull();
    const created = tables.tasks.find((t) => t.id !== "t1");
    expect(created?.parent_id).toBe("padre1");
  });

  it("una tarea recurrente en la raíz del proyecto crea la siguiente también en la raíz (parent_id nulo)", async () => {
    const tables: Record<string, Row[]> = {
      tasks: [baseTaskRow({ parent_id: null })],
      user_preferences: [{ user_id: "u1", timezone: "America/Argentina/Buenos_Aires" }],
      task_labels: [],
    };
    const supabase = fakeSupabase(tables);

    await createNextRecurringOccurrence(supabase, "t1", NOW);

    const created = tables.tasks.find((t) => t.id !== "t1");
    expect(created?.parent_id).toBeNull();
  });

  it("hereda proyecto, sección, título, descripción, prioridad, duración, fecha límite y etiquetas", async () => {
    const tables: Record<string, Row[]> = {
      tasks: [
        baseTaskRow({
          section_id: "sec1",
          description: { type: "doc", content: [] },
          priority: 2,
          duration_minutes: 30,
          deadline: "2026-08-20T00:00:00.000Z",
          task_labels: [{ label_id: "l1" }, { label_id: "l2" }],
        }),
      ],
      user_preferences: [{ user_id: "u1", timezone: "America/Argentina/Buenos_Aires" }],
      task_labels: [],
    };
    const supabase = fakeSupabase(tables);

    const result = await createNextRecurringOccurrence(supabase, "t1", NOW);

    const created = tables.tasks.find((t) => t.id !== "t1");
    expect(created).toMatchObject({
      project_id: "p1",
      section_id: "sec1",
      title: "Regar las plantas",
      description: { type: "doc", content: [] },
      priority: 2,
      duration_minutes: 30,
      deadline: "2026-08-20T00:00:00.000Z",
    });
    expect(tables.task_labels.filter((l) => l.task_id === result?.id).map((l) => l.label_id).sort()).toEqual([
      "l1",
      "l2",
    ]);
    // Nunca hereda subtareas, comentarios ni recordatorios: ni siquiera se leen.
    expect(created?.parent_id).toBeNull();
  });

  it("serie terminada (recurrence_count agotado): no crea ninguna instancia nueva", async () => {
    const tables: Record<string, Row[]> = {
      tasks: [baseTaskRow({ recurrence_count: 0 })],
      user_preferences: [{ user_id: "u1", timezone: "America/Argentina/Buenos_Aires" }],
    };
    const supabase = fakeSupabase(tables);

    const result = await createNextRecurringOccurrence(supabase, "t1", NOW);

    expect(result).toBeNull();
    expect(tables.tasks).toHaveLength(1);
  });

  it("completar, descompletar y volver a completar no duplica la ocurrencia siguiente", async () => {
    const tables: Record<string, Row[]> = {
      tasks: [baseTaskRow()],
      user_preferences: [{ user_id: "u1", timezone: "America/Argentina/Buenos_Aires" }],
      task_labels: [],
    };
    const supabase = fakeSupabase(tables);

    const first = await createNextRecurringOccurrence(supabase, "t1", NOW);
    const second = await createNextRecurringOccurrence(supabase, "t1", NOW);

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(tables.tasks).toHaveLength(2);
  });

  it("la ocurrencia siguiente ya completada no bloquea una nueva", async () => {
    const tables: Record<string, Row[]> = {
      tasks: [baseTaskRow(), baseTaskRow({ id: "t2", due_date: "2026-08-10", completed_at: "2026-08-10T10:00:00.000Z" })],
      user_preferences: [{ user_id: "u1", timezone: "America/Argentina/Buenos_Aires" }],
      task_labels: [],
    };
    const supabase = fakeSupabase(tables);

    const result = await createNextRecurringOccurrence(supabase, "t1", NOW);

    expect(result).not.toBeNull();
    expect(tables.tasks).toHaveLength(3);
  });

  it("una pendiente con otro padre no cuenta como la misma serie", async () => {
    const tables: Record<string, Row[]> = {
      tasks: [baseTaskRow(), baseTaskRow({ id: "t2", due_date: "2026-08-10", parent_id: "otro" })],
      user_preferences: [{ user_id: "u1", timezone: "America/Argentina/Buenos_Aires" }],
      task_labels: [],
    };
    const result = await createNextRecurringOccurrence(fakeSupabase(tables), "t1", NOW);
    expect(result).not.toBeNull();
  });

  it("falla la copia de etiquetas: la ocurrencia se conserva y se informa labelsFailed", async () => {
    const tables: Record<string, Row[]> = {
      tasks: [baseTaskRow({ task_labels: [{ label_id: "l1" }] })],
      user_preferences: [{ user_id: "u1", timezone: "America/Argentina/Buenos_Aires" }],
      task_labels: [],
    };
    const supabase = fakeSupabase(tables, ["task_labels"]);

    const result = await createNextRecurringOccurrence(supabase, "t1", NOW);

    expect(result).toMatchObject({ labelsFailed: true });
    expect(tables.tasks.find((t) => t.id === result?.id)).toBeDefined();
    expect(tables.task_labels).toHaveLength(0);
  });

  it("copia de etiquetas correcta: no marca labelsFailed", async () => {
    const tables: Record<string, Row[]> = {
      tasks: [baseTaskRow({ task_labels: [{ label_id: "l1" }] })],
      user_preferences: [{ user_id: "u1", timezone: "America/Argentina/Buenos_Aires" }],
      task_labels: [],
    };
    const result = await createNextRecurringOccurrence(fakeSupabase(tables), "t1", NOW);
    expect(result?.labelsFailed).toBeUndefined();
  });
});
