import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { consultarTareas, consultarTareasInputSchema } from "./consultar-tareas";
import type { RawTaskRow } from "./shared";

function rawTask(id: string): RawTaskRow {
  return {
    id,
    project_id: "project-1",
    section_id: null,
    parent_id: null,
    title: `Tarea ${id}`,
    description: null,
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 1000,
    task_labels: null,
  };
}

/** Fake mínimo del builder que devuelve `supabase.rpc(...)`: encadena `select`/`order`/`range` y resuelve al llegar a `range`, igual que el cliente real. */
function fakeSupabase(rows: RawTaskRow[]) {
  const rangeSpy = vi.fn().mockResolvedValue({ data: rows, error: null });
  const orderSpy = vi.fn().mockReturnValue({ range: rangeSpy });
  const selectSpy = vi.fn().mockReturnValue({ order: orderSpy });
  const rpcSpy = vi.fn().mockReturnValue({ select: selectSpy });
  const supabase = { rpc: rpcSpy } as unknown as SupabaseClient<Database>;
  return { supabase, rpcSpy, selectSpy, orderSpy, rangeSpy };
}

describe("consultarTareas", () => {
  it("una consulta inválida se rechaza con la posición del error, sin llamar a la base", async () => {
    const { supabase, rpcSpy } = fakeSupabase([]);
    const result = await consultarTareas(supabase, { consulta: "campo-que-no-existe:1" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/posición/);
    }
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it("una consulta válida llama a buscar_tareas con el AST parseado", async () => {
    const { supabase, rpcSpy } = fakeSupabase([rawTask("t1")]);
    await consultarTareas(supabase, { consulta: "priority:1" });
    expect(rpcSpy).toHaveBeenCalledWith("buscar_tareas", {
      ast: { type: "field", field: "priority", values: [1] },
    });
  });

  it("sin fila de más, no queda truncado", async () => {
    const { supabase } = fakeSupabase([rawTask("t1"), rawTask("t2")]);
    const result = await consultarTareas(supabase, { consulta: "priority:1", limite: 10 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks).toHaveLength(2);
      expect(result.truncated).toBe(false);
      expect(result.next_cursor).toBeNull();
    }
  });

  it("con una fila de más que el límite, queda truncado con el cursor siguiente", async () => {
    const rows = [rawTask("t1"), rawTask("t2"), rawTask("t3")];
    const { supabase } = fakeSupabase(rows);
    const result = await consultarTareas(supabase, { consulta: "priority:1", limite: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.tasks).toHaveLength(2);
      expect(result.truncated).toBe(true);
      expect(result.next_cursor).toBe("2");
    }
  });

  it("un error del RPC se propaga como resultado no-ok, no como excepción", async () => {
    const supabase = {
      rpc: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: null, error: { message: "AST inválido" } }),
          }),
        }),
      }),
    } as unknown as SupabaseClient<Database>;

    const result = await consultarTareas(supabase, { consulta: "priority:1" });
    expect(result).toEqual({ ok: false, error: "AST inválido" });
  });

  it("una consulta vacía se rechaza con el mensaje del parser, no con un error genérico, sin llamar a la base", async () => {
    const { supabase, rpcSpy } = fakeSupabase([]);
    const result = await consultarTareas(supabase, { consulta: "" });
    expect(result).toEqual({ ok: false, error: "La consulta está vacía. (posición 0, longitud 0)" });
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it("un límite fuera de rango (negativo, cero o absurdamente grande) se normaliza en vez de rechazarse", async () => {
    const rows = [rawTask("t1"), rawTask("t2")];

    const { supabase: withNegative, rangeSpy: rangeNegative } = fakeSupabase(rows);
    await consultarTareas(withNegative, { consulta: "priority:1", limite: -5 });
    expect(rangeNegative).toHaveBeenCalledWith(0, 1);

    const { supabase: withZero, rangeSpy: rangeZero } = fakeSupabase(rows);
    await consultarTareas(withZero, { consulta: "priority:1", limite: 0 });
    expect(rangeZero).toHaveBeenCalledWith(0, 1);

    const { supabase: withHuge, rangeSpy: rangeHuge } = fakeSupabase(rows);
    await consultarTareas(withHuge, { consulta: "priority:1", limite: 999_999_999 });
    expect(rangeHuge).toHaveBeenCalledWith(0, 200);
  });

  it("un cursor con basura (no numérico o negativo) vuelve al offset 0 en vez de tirar", async () => {
    const rows = [rawTask("t1")];

    const { supabase: withGarbage, rangeSpy: rangeGarbage } = fakeSupabase(rows);
    await consultarTareas(withGarbage, { consulta: "priority:1", cursor: "no-es-un-numero" });
    expect(rangeGarbage).toHaveBeenCalledWith(0, 50);

    const { supabase: withNegative, rangeSpy: rangeNegative } = fakeSupabase(rows);
    await consultarTareas(withNegative, { consulta: "priority:1", cursor: "-10" });
    expect(rangeNegative).toHaveBeenCalledWith(0, 50);
  });

  it("el esquema de entrada acepta consulta vacía y límite fuera de rango: la validación queda en manos del handler, no del protocolo", () => {
    expect(consultarTareasInputSchema.safeParse({ consulta: "" }).success).toBe(true);
    expect(consultarTareasInputSchema.safeParse({ consulta: "priority:1", limite: -5 }).success).toBe(true);
    expect(consultarTareasInputSchema.safeParse({ consulta: "priority:1", limite: 0 }).success).toBe(true);
    expect(consultarTareasInputSchema.safeParse({ consulta: "priority:1", limite: 10.5 }).success).toBe(true);
    expect(consultarTareasInputSchema.safeParse({ consulta: "priority:1", limite: 999_999_999 }).success).toBe(true);
  });
});
