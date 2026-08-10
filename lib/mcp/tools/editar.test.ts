import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { editar } from "./editar";

const ID = "11111111-1111-4111-8111-111111111111";

function fakeSupabase(
  opts: {
    missing?: boolean;
    updateSpies?: Partial<Record<string, (payload: unknown) => void>>;
    taskLabelsDeleteSpy?: () => void;
    taskLabelsInsertSpy?: (payload: unknown) => void;
  } = {},
) {
  const from = (table: string) => {
    if (table === "task_labels") {
      return {
        delete: () => ({
          eq: () => {
            opts.taskLabelsDeleteSpy?.();
            return Promise.resolve({ error: null });
          },
        }),
        insert: (rows: unknown) => {
          opts.taskLabelsInsertSpy?.(rows);
          return Promise.resolve({ error: null });
        },
      };
    }
    return {
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.missing ? null : { id: ID }, error: null }) }),
      }),
      update: (patch: unknown) => {
        opts.updateSpies?.[table]?.(patch);
        return { eq: () => Promise.resolve({ error: null }) };
      },
    };
  };
  const auth = { getUser: () => Promise.resolve({ data: { user: { id: "user-1" } }, error: null }) };
  return { from, auth } as unknown as SupabaseClient<Database>;
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
    const taskLabelsDeleteSpy = vi.fn();
    const taskLabelsInsertSpy = vi.fn();
    const supabase = fakeSupabase({ taskLabelsDeleteSpy, taskLabelsInsertSpy });

    const result = await editar(supabase, { tipo: "tarea", id: ID, labels: ["l1", "l2"] });
    expect(result.ok).toBe(true);
    expect(taskLabelsDeleteSpy).toHaveBeenCalled();
    expect(taskLabelsInsertSpy).toHaveBeenCalledWith([
      { task_id: ID, label_id: "l1", user_id: "user-1" },
      { task_id: ID, label_id: "l2", user_id: "user-1" },
    ]);
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
