import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { editar } from "./editar";

const ID = "11111111-1111-4111-8111-111111111111";
const P1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const P2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const S1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const S2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const CHILD = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
const GRANDCHILD = "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";
const OTHER_TASK = "cccccccc-cccc-4ccc-8ccc-ccccccccccc4";

type Row = Record<string, unknown>;

/** Base en memoria: select/update/insert/delete con eq/in/is/not, para afirmar lo que quedó guardado. */
function memoryDb(tables: Record<string, Row[]>, hooks: { failInsert?: (table: string) => boolean; onUpdate?: (table: string, patch: unknown) => void } = {}) {
  const from = (table: string) => {
    const make = (mode: "select" | "update" | "insert" | "delete", payload?: unknown) => {
      const filters: ((r: Row) => boolean)[] = [];
      const matching = () => (tables[table] ??= []).filter((r) => filters.every((f) => f(r)));
      const execute = () => {
        if (mode === "insert") {
          if (hooks.failInsert?.(table)) return { data: null, error: { message: "rechazado" } };
          (tables[table] ??= []).push(...(payload as Row[]));
          return { data: null, error: null };
        }
        const rows = matching();
        if (mode === "update") {
          hooks.onUpdate?.(table, payload);
          rows.forEach((r) => Object.assign(r, payload));
        }
        if (mode === "delete") tables[table] = tables[table].filter((r) => !rows.includes(r));
        return { data: rows, error: null };
      };
      const b = {
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
        in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), b),
        is: (c: string, v: unknown) => (filters.push((r) => (r[c] ?? null) === v), b),
        select: () => b,
        maybeSingle: () => Promise.resolve({ data: matching()[0] ?? null, error: null }),
        single: () => Promise.resolve({ data: matching()[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve(execute()),
      };
      return b;
    };
    return {
      select: () => make("select"),
      update: (patch: unknown) => make("update", patch),
      insert: (rows: Row | Row[]) => make("insert", Array.isArray(rows) ? rows : [rows]),
      delete: () => make("delete"),
    };
  };
  const auth = { getUser: () => Promise.resolve({ data: { user: { id: "user-1" } }, error: null }) };
  return { from, auth } as unknown as SupabaseClient<Database>;
}

function baseTables(overrides: Record<string, Row[]> = {}): Record<string, Row[]> {
  return {
    projects: [{ id: ID }, { id: P1 }, { id: P2 }],
    sections: [
      { id: S1, project_id: P1 },
      { id: S2, project_id: P2 },
    ],
    tasks: [
      { id: ID, project_id: P1, section_id: S1, parent_id: null },
      { id: CHILD, project_id: P1, section_id: S1, parent_id: ID },
      { id: GRANDCHILD, project_id: P1, section_id: S1, parent_id: CHILD },
      { id: OTHER_TASK, project_id: P2, section_id: null, parent_id: null },
    ],
    habits: [{ id: ID }],
    labels: [{ id: ID }],
    filters: [{ id: ID }],
    task_labels: [],
    ...overrides,
  };
}

const taskRow = (tables: Record<string, Row[]>, id: string) => tables.tasks.find((t) => t.id === id)!;

function fakeSupabase(opts: { missing?: boolean; updateSpies?: Partial<Record<string, (payload: unknown) => void>> } = {}) {
  const tables = baseTables(opts.missing ? { tasks: [], projects: [], habits: [], labels: [], filters: [] } : {});
  return memoryDb(tables, { onUpdate: (table, patch) => opts.updateSpies?.[table]?.(patch) });
}

describe("editar", () => {
  it("completed_at se rechaza explícitamente, sin tocar la base", async () => {
    const updateSpy = vi.fn();
    const supabase = fakeSupabase({ updateSpies: { tasks: updateSpy } });

    const result = await editar(supabase, { tipo: "tarea", id: ID, completed_at: new Date().toISOString() });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/completar_tarea/);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("position se rechaza explícitamente, para cualquier tipo, sin tocar la base", async () => {
    const updateSpy = vi.fn();
    const supabase = fakeSupabase({ updateSpies: { projects: updateSpy } });

    const result = await editar(supabase, { tipo: "proyecto", id: ID, position: 5000 });
    expect(result.ok).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("un id con formato inválido se rechaza antes de tocar la base", async () => {
    const result = await editar(fakeSupabase(), { tipo: "tarea", id: "no-es-uuid" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/UUID/);
  });

  it("un id que no existe (o de otra cuenta) da un error legible", async () => {
    const supabase = fakeSupabase({ missing: true });
    const result = await editar(supabase, { tipo: "tarea", id: ID, title: "Nuevo título" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/no se encontró/i);
  });

  it("edita campos estructurados de una tarea", async () => {
    const updateSpy = vi.fn();
    const supabase = fakeSupabase({ updateSpies: { tasks: updateSpy } });

    const result = await editar(supabase, { tipo: "tarea", id: ID, title: "Nuevo título", priority: 1 });
    expect(result.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({ title: "Nuevo título", priority: 1 });
  });

  it("reemplaza el conjunto completo de etiquetas de una tarea, no incremental", async () => {
    const tables = baseTables({ task_labels: [{ task_id: ID, label_id: "l0", user_id: "user-1" }, { task_id: ID, label_id: "l1", user_id: "user-1" }] });
    const result = await editar(memoryDb(tables), { tipo: "tarea", id: ID, labels: ["l1", "l2"] });
    expect(result.ok).toBe(true);
    expect(tables.task_labels.map((r) => r.label_id).sort()).toEqual(["l1", "l2"]);
    expect(tables.task_labels.every((r) => r.user_id === "user-1")).toBe(true);
  });

  it("si la base rechaza asignar una etiqueta nueva, la tarea conserva las que tenía", async () => {
    const tables = baseTables({ task_labels: [{ task_id: ID, label_id: "l0", user_id: "user-1" }] });
    const db = memoryDb(tables, { failInsert: (t) => t === "task_labels" });
    await expect(editar(db, { tipo: "tarea", id: ID, labels: ["l1"] })).rejects.toBeDefined();
    expect(tables.task_labels.map((r) => r.label_id)).toEqual(["l0"]);
  });

  describe("ubicación de la tarea", () => {
    it("un ciclo se rechaza y no modifica nada", async () => {
      const tables = baseTables();
      const onUpdate = vi.fn();
      const result = await editar(memoryDb(tables, { onUpdate }), { tipo: "tarea", id: ID, parent_id: GRANDCHILD, title: "x" });
      expect(result.ok).toBe(false);
      expect(onUpdate).not.toHaveBeenCalled();
      expect(taskRow(tables, ID).parent_id).toBeNull();
    });

    it("una tarea no puede ser su propio padre", async () => {
      const tables = baseTables();
      const result = await editar(memoryDb(tables), { tipo: "tarea", id: ID, parent_id: ID });
      expect(result.ok).toBe(false);
      expect(taskRow(tables, ID).parent_id).toBeNull();
    });

    it("un padre de otro proyecto se rechaza sin cambiar project_id", async () => {
      const tables = baseTables();
      const result = await editar(memoryDb(tables), { tipo: "tarea", id: CHILD, parent_id: OTHER_TASK });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected rejection");
      expect(result.error).toMatch(/parent_id/);
      expect(taskRow(tables, CHILD).parent_id).toBe(ID);
    });

    it("una sección de otro proyecto se rechaza", async () => {
      const tables = baseTables();
      const result = await editar(memoryDb(tables), { tipo: "tarea", id: ID, section_id: S2 });
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected rejection");
      expect(result.error).toMatch(/section_id/);
      expect(taskRow(tables, ID).section_id).toBe(S1);
    });

    it("cambiar de proyecto arrastra las subtareas de todos los niveles, sin sección", async () => {
      const tables = baseTables();
      const result = await editar(memoryDb(tables), { tipo: "tarea", id: ID, project_id: P2 });
      expect(result.ok).toBe(true);
      for (const id of [ID, CHILD, GRANDCHILD]) {
        expect(taskRow(tables, id).project_id).toBe(P2);
        expect(taskRow(tables, id).section_id).toBeNull();
      }
      expect(taskRow(tables, OTHER_TASK).project_id).toBe(P2);
    });

    it("reintentar tras una falla del arrastre mueve las subtareas que quedaron atrás", async () => {
      const tables = baseTables();
      // Estado que deja una llamada anterior que movió la tarea y falló antes del arrastre.
      Object.assign(taskRow(tables, ID), { project_id: P2, section_id: null });
      const result = await editar(memoryDb(tables), { tipo: "tarea", id: ID, project_id: P2 });
      expect(result.ok).toBe(true);
      for (const id of [CHILD, GRANDCHILD]) expect(taskRow(tables, id).project_id).toBe(P2);
    });

    it("indicar el mismo proyecto no toca la sección de las subtareas que ya están en él", async () => {
      const tables = baseTables();
      const currentProject = taskRow(tables, ID).project_id;
      taskRow(tables, CHILD).section_id = "seccion-de-la-subtarea";
      const result = await editar(memoryDb(tables), { tipo: "tarea", id: ID, project_id: currentProject as string });
      expect(result.ok).toBe(true);
      expect(taskRow(tables, CHILD).section_id).toBe("seccion-de-la-subtarea");
    });

    it("un padre válido del mismo proyecto se acepta y se guarda", async () => {
      const tables = baseTables();
      const result = await editar(memoryDb(tables), { tipo: "tarea", id: GRANDCHILD, parent_id: ID });
      expect(result.ok).toBe(true);
      expect(taskRow(tables, GRANDCHILD).parent_id).toBe(ID);
    });
  });

  it("una description con forma inválida en tipo tarea se rechaza, sin escribir nada", async () => {
    const updateSpy = vi.fn();
    const supabase = fakeSupabase({ updateSpies: { tasks: updateSpy } });

    const result = await editar(supabase, { tipo: "tarea", id: ID, description: { text: "hola" } });
    expect(result.ok).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("edita un proyecto (name, color)", async () => {
    const updateSpy = vi.fn();
    const supabase = fakeSupabase({ updateSpies: { projects: updateSpy } });

    const result = await editar(supabase, { tipo: "proyecto", id: ID, name: "Renombrado", color: "verde" });
    expect(result.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({ name: "Renombrado", color: "verde" });
  });

  it("un filtro con query inválida se rechaza antes de guardar", async () => {
    const updateSpy = vi.fn();
    const supabase = fakeSupabase({ updateSpies: { filters: updateSpy } });

    const result = await editar(supabase, { tipo: "filtro", id: ID, query: "priority:" });
    expect(result.ok).toBe(false);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("tipo: seccion se rechaza", async () => {
    const result = await editar(fakeSupabase(), { tipo: "seccion", id: ID, name: "x" });
    expect(result.ok).toBe(false);
  });
});
