import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listarEstructura, listarEstructuraInputSchema } from "./listar-estructura";

/** Fake de `.from(tabla)`: cada tabla resuelve a la respuesta que se le configuró, sin importar qué métodos se encadenen. */
function fakeSupabase(responses: Record<string, { data: unknown; error: unknown }>) {
  const from = (table: string) => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = chain;
    builder.order = chain;
    builder.range = () => Promise.resolve(responses[table]);
    return builder;
  };
  return { from } as unknown as SupabaseClient<Database>;
}

describe("listarEstructura", () => {
  it("conserva la relación padre-hijo de proyectos anidados", async () => {
    const supabase = fakeSupabase({
      projects: {
        data: [
          { id: "p1", name: "Trabajo", parent_id: null, position: 1000, color: "azul", is_inbox: false, is_archived: false, sections: [] },
          { id: "p2", name: "Sub-proyecto", parent_id: "p1", position: 1000, color: "azul", is_inbox: false, is_archived: false, sections: [] },
        ],
        error: null,
      },
      labels: { data: [], error: null },
      filters: { data: [], error: null },
    });

    const result = await listarEstructura(supabase, {});
    const child = result.projects.find((p) => p.id === "p2");
    expect(child?.parent_id).toBe("p1");
  });

  it("incluye secciones, etiquetas y filtros", async () => {
    const supabase = fakeSupabase({
      projects: {
        data: [{ id: "p1", name: "Trabajo", parent_id: null, position: 1000, color: "azul", is_inbox: false, is_archived: false, sections: [{ id: "s1", name: "Por hacer", position: 1000 }] }],
        error: null,
      },
      labels: { data: [{ id: "l1", name: "Urgente", color: "rojo" }], error: null },
      filters: { data: [{ id: "f1", name: "Vencidas", query: "due:overdue" }], error: null },
    });

    const result = await listarEstructura(supabase, {});
    expect(result.projects[0].sections).toEqual([{ id: "s1", name: "Por hacer", position: 1000 }]);
    expect(result.labels).toEqual([{ id: "l1", name: "Urgente", color: "rojo" }]);
    expect(result.filters).toEqual([{ id: "f1", name: "Vencidas", query: "due:overdue" }]);
  });

  it("una fila de más que el límite de proyectos queda truncada con cursor siguiente", async () => {
    const rows = [1, 2, 3].map((n) => ({
      id: `p${n}`,
      name: `Proyecto ${n}`,
      parent_id: null,
      position: 1000,
      color: null,
      is_inbox: false,
      is_archived: false,
      sections: [],
    }));
    const supabase = fakeSupabase({
      projects: { data: rows, error: null },
      labels: { data: [], error: null },
      filters: { data: [], error: null },
    });

    const result = await listarEstructura(supabase, { limite: 2 });
    expect(result.projects).toHaveLength(2);
    expect(result.truncated).toBe(true);
    expect(result.next_cursor).toBe("2");
  });

  it("un límite fuera de rango (negativo o absurdamente grande) se normaliza en vez de rechazarse", async () => {
    const rangeSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    const from = () => ({ select: () => ({ order: () => ({ range: rangeSpy }) }) });
    const supabase = { from } as unknown as SupabaseClient<Database>;

    await listarEstructura(supabase, { limite: -5 });
    expect(rangeSpy).toHaveBeenCalledWith(0, 1);

    rangeSpy.mockClear();
    await listarEstructura(supabase, { limite: 999_999_999 });
    expect(rangeSpy).toHaveBeenCalledWith(0, 200);
  });

  it("un cursor con basura (no numérico o negativo) vuelve al offset 0 en vez de tirar", async () => {
    const rangeSpy = vi.fn().mockResolvedValue({ data: [], error: null });
    const from = () => ({ select: () => ({ order: () => ({ range: rangeSpy }) }) });
    const supabase = { from } as unknown as SupabaseClient<Database>;

    await listarEstructura(supabase, { cursor: "no-es-un-numero" });
    expect(rangeSpy).toHaveBeenCalledWith(0, 50);

    rangeSpy.mockClear();
    await listarEstructura(supabase, { cursor: "-10" });
    expect(rangeSpy).toHaveBeenCalledWith(0, 50);
  });

  it("el esquema de entrada acepta límite fuera de rango: la validación queda en manos de resolvePageSize, no del protocolo", () => {
    expect(listarEstructuraInputSchema.safeParse({ limite: -5 }).success).toBe(true);
    expect(listarEstructuraInputSchema.safeParse({ limite: 0 }).success).toBe(true);
    expect(listarEstructuraInputSchema.safeParse({ limite: 10.5 }).success).toBe(true);
    expect(listarEstructuraInputSchema.safeParse({ limite: 999_999_999 }).success).toBe(true);
  });
});
