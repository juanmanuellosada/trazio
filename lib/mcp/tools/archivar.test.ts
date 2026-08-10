import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { archivar } from "./archivar";

const ID = "11111111-1111-4111-8111-111111111111";

function fakeSupabase(opts: { missing?: boolean; updateSpies?: Partial<Record<string, (payload: unknown) => void>> } = {}) {
  const from = (table: string) => ({
    select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.missing ? null : { id: ID }, error: null }) }) }),
    update: (patch: unknown) => {
      opts.updateSpies?.[table]?.(patch);
      return { eq: () => Promise.resolve({ error: null }) };
    },
  });
  return { from } as unknown as SupabaseClient<Database>;
}

describe("archivar", () => {
  it("archiva un proyecto (is_archived: true, nunca borra)", async () => {
    const updateSpy = vi.fn();
    const supabase = fakeSupabase({ updateSpies: { projects: updateSpy } });

    const result = await archivar(supabase, { tipo: "proyecto", id: ID });
    expect(result.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({ is_archived: true });
  });

  it("archiva un hábito", async () => {
    const updateSpy = vi.fn();
    const supabase = fakeSupabase({ updateSpies: { habits: updateSpy } });

    const result = await archivar(supabase, { tipo: "habito", id: ID });
    expect(result.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalledWith({ is_archived: true });
  });

  it("un tipo fuera de proyecto y hábito se rechaza", async () => {
    const result = await archivar(fakeSupabase(), { tipo: "tarea", id: ID });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/proyecto.*habito/);
  });

  it("un id con formato inválido se rechaza antes de tocar la base", async () => {
    const result = await archivar(fakeSupabase(), { tipo: "proyecto", id: "no-es-uuid" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/UUID/);
  });

  it("un id que no existe (o de otra cuenta) da un error legible", async () => {
    const result = await archivar(fakeSupabase({ missing: true }), { tipo: "proyecto", id: ID });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/no se encontró/i);
  });
});
