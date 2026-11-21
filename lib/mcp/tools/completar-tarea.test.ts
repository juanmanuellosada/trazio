import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { completarTarea } from "./completar-tarea";

const ID = "11111111-1111-4111-8111-111111111111";

type Row = Record<string, unknown>;

/**
 * Base en memoria. `createNextRecurringOccurrence` (`lib/recurrence/create-next-occurrence.ts`,
 * reusada tal cual — no reimplementada acá) hace su propia serie de lecturas e inserciones:
 * con tablas reales en memoria se afirma lo que quedó guardado, no solo lo que se devolvió.
 */
function memoryDb(tables: Record<string, Row[]>, hooks: { failInsert?: (table: string) => boolean; onUpdate?: (patch: unknown) => void } = {}) {
  let nextId = 0;
  const from = (table: string) => {
    const make = (mode: "select" | "update" | "insert", payload?: unknown) => {
      const filters: ((r: Row) => boolean)[] = [];
      const matching = () => (tables[table] ??= []).filter((r) => filters.every((f) => f(r)));
      const execute = () => {
        if (mode === "insert") {
          if (hooks.failInsert?.(table)) return { data: null, error: { message: "rechazado" } };
          const rows = (payload as Row[]).map((r) => ({ id: `generado-${++nextId}`, updated_at: "2026-08-10T00:00:00Z", completed_at: null, ...r }));
          tables[table] ??= [];
          tables[table].push(...rows);
          return { data: rows, error: null };
        }
        const rows = matching();
        if (mode === "update") {
          hooks.onUpdate?.(payload);
          rows.forEach((r) => Object.assign(r, payload));
        }
        return { data: rows, error: null };
      };
      const b = {
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
        neq: (c: string, v: unknown) => (filters.push((r) => r[c] !== v), b),
        is: (c: string, v: unknown) => (filters.push((r) => (r[c] ?? null) === v), b),
        not: (c: string, _op: string, v: unknown) => (filters.push((r) => (r[c] ?? null) !== v), b),
        limit: () => b,
        select: () => b,
        maybeSingle: () => Promise.resolve({ data: matching()[0] ?? null, error: null }),
        single: () => (mode === "insert" ? Promise.resolve({ data: execute().data?.[0], error: null }) : Promise.resolve({ data: matching()[0] ?? null, error: null })),
        then: (resolve: (v: unknown) => void) => resolve(execute()),
      };
      return b;
    };
    return {
      select: () => make("select"),
      update: (patch: unknown) => make("update", patch),
      insert: (rows: Row | Row[]) => make("insert", Array.isArray(rows) ? rows : [rows]),
    };
  };
  return { from } as unknown as SupabaseClient<Database>;
}

const TASK = {
  id: ID,
  user_id: "user-1",
  project_id: "p1",
  section_id: null,
  parent_id: null,
  title: "Tarea",
  description: null,
  priority: 4,
  due_date: null,
  due_at: null,
  duration_minutes: null,
  deadline: null,
  recurrence_rule: null,
  recurrence_ends_at: null,
  recurrence_count: null,
  recurrence_anchor: null,
  position: 1000,
  completed_at: null,
  task_labels: [],
};
const RECURRING = { ...TASK, recurrence_rule: "FREQ=DAILY", due_date: "2026-08-10" };

function tablesWith(task: Row | null): Record<string, Row[]> {
  return { tasks: task ? [{ ...task }] : [], user_preferences: [{ user_id: "user-1", timezone: "America/Argentina/Buenos_Aires" }], task_labels: [] };
}

describe("completarTarea", () => {
  it("un id con formato inválido se rechaza antes de tocar la base", async () => {
    const result = await completarTarea(memoryDb(tablesWith(TASK)), { id: "no-es-uuid", completado: true });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/UUID/);
  });

  it("un id que no existe (o de otra cuenta) da un error legible", async () => {
    const result = await completarTarea(memoryDb(tablesWith(null)), { id: ID, completado: true });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/no se encontró/i);
  });

  it("completar una tarea no recurrente guarda completed_at y no crea ninguna ocurrencia", async () => {
    const tables = tablesWith(TASK);
    const result = await completarTarea(memoryDb(tables), { id: ID, completado: true });
    expect(result).toEqual({ ok: true, next_occurrence_id: null });
    expect(tables.tasks).toHaveLength(1);
    expect(tables.tasks[0].completed_at).toEqual(expect.any(String));
  });

  it("completar una tarea recurrente crea la siguiente ocurrencia de la serie", async () => {
    const tables = tablesWith(RECURRING);
    const result = await completarTarea(memoryDb(tables), { id: ID, completado: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.next_occurrence_id).toBe(tables.tasks[1].id);
    expect(tables.tasks).toHaveLength(2);
    expect(tables.tasks[1].completed_at).toBeNull();
  });

  it("completar dos veces deja una sola ocurrencia siguiente y la fecha de la primera llamada", async () => {
    const tables = tablesWith(RECURRING);
    const db = memoryDb(tables);

    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-08-10T12:00:00Z"));
      await completarTarea(db, { id: ID, completado: true });
    } finally {
      vi.useRealTimers();
    }
    const firstCompletion = tables.tasks[0].completed_at;
    expect(firstCompletion).toBe("2026-08-10T12:00:00.000Z");
    const second = await completarTarea(db, { id: ID, completado: true });

    expect(second).toEqual({ ok: true, next_occurrence_id: null });
    expect(tables.tasks).toHaveLength(2);
    expect(tables.tasks[0].completed_at).toBe(firstCompletion);
  });

  it("reintentar tras una falla que dejó la tarea completada sin ocurrencia siguiente la crea", async () => {
    const tables = tablesWith({ ...RECURRING, completed_at: "2026-08-10T12:00:00.000Z" });
    const result = await completarTarea(memoryDb(tables), { id: ID, completado: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(tables.tasks).toHaveLength(2);
    expect(result.next_occurrence_id).toBe(tables.tasks[1].id);
    expect(tables.tasks[0].completed_at).toBe("2026-08-10T12:00:00.000Z");
  });

  it("reintentar no duplica una ocurrencia siguiente que ya se completó", async () => {
    const tables = tablesWith(RECURRING);
    const db = memoryDb(tables);
    await completarTarea(db, { id: ID, completado: true });
    tables.tasks[1].completed_at = "2026-08-10T13:00:00.000Z";

    const again = await completarTarea(db, { id: ID, completado: true });

    expect(again).toEqual({ ok: true, next_occurrence_id: null });
    expect(tables.tasks).toHaveLength(2);
  });

  it("descompletar una tarea ya pendiente no la modifica", async () => {
    const onUpdate = vi.fn();
    const result = await completarTarea(memoryDb(tablesWith(RECURRING), { onUpdate }), { id: ID, completado: false });
    expect(result).toEqual({ ok: true, next_occurrence_id: null });
    expect(onUpdate).toHaveBeenCalledTimes(1); // intentó la actualización condicional, que no tocó ninguna fila
  });

  it("descompletar una completada la deja pendiente, sin crear una ocurrencia", async () => {
    const tables = tablesWith({ ...RECURRING, completed_at: "2026-08-09T00:00:00Z" });
    const result = await completarTarea(memoryDb(tables), { id: ID, completado: false });
    expect(result).toEqual({ ok: true, next_occurrence_id: null });
    expect(tables.tasks).toHaveLength(1);
    expect(tables.tasks[0].completed_at).toBeNull();
  });

  it("si la ocurrencia se creó sin etiquetas, lo avisa en la respuesta", async () => {
    const tables = tablesWith({ ...RECURRING, task_labels: [{ label_id: "l1" }] });
    const db = memoryDb(tables, { failInsert: (t) => t === "task_labels" });
    const result = await completarTarea(db, { id: ID, completado: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.next_occurrence_id).toBe(tables.tasks[1].id);
    expect(result.aviso).toMatch(/etiquetas/);
  });
});
