import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { crear } from "./crear";

function fakeSupabase(opts: { insertSpies?: Partial<Record<string, (payload: unknown) => void>> } = {}) {
  const from = (table: string) => ({
    insert: (row: unknown) => {
      opts.insertSpies?.[table]?.(row);
      return { select: () => ({ single: () => Promise.resolve({ data: { id: `${table}-1` }, error: null }) }) };
    },
  });
  const auth = { getUser: () => Promise.resolve({ data: { user: { id: "user-1" } }, error: null }) };
  return { from, auth } as unknown as SupabaseClient<Database>;
}

describe("crear", () => {
  it("tipo: tarea se rechaza — para eso existe crear_tarea", async () => {
    const result = await crear(fakeSupabase(), { tipo: "tarea", name: "x" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/crear_tarea/);
  });

  it("un position en el payload se rechaza para cualquier tipo, sin tocar la base", async () => {
    const insertSpy = vi.fn();
    const supabase = fakeSupabase({ insertSpies: { projects: insertSpy } });

    const result = await crear(supabase, { tipo: "proyecto", name: "Nuevo", position: 5000 });
    expect(result.ok).toBe(false);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("crea un proyecto sin mandar position: la base la asigna sola", async () => {
    const insertSpy = vi.fn();
    const supabase = fakeSupabase({ insertSpies: { projects: insertSpy } });

    const result = await crear(supabase, { tipo: "proyecto", name: "Nuevo", color: "azul" });
    expect(result.ok).toBe(true);
    expect("position" in insertSpy.mock.calls[0][0]).toBe(false);
  });

  it("un hábito sin los campos requeridos se rechaza con un mensaje claro", async () => {
    const result = await crear(fakeSupabase(), { tipo: "habito", name: "Meditar" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/color, icon, duration_minutes y frequency_type/);
  });

  it("crea un hábito con todos los campos requeridos", async () => {
    const insertSpy = vi.fn();
    const supabase = fakeSupabase({ insertSpies: { habits: insertSpy } });

    const result = await crear(supabase, {
      tipo: "habito",
      name: "Meditar",
      color: "azul",
      icon: "star",
      duration_minutes: 10,
      frequency_type: "daily",
    });
    expect(result.ok).toBe(true);
  });

  it("una etiqueta sin color se rechaza", async () => {
    const result = await crear(fakeSupabase(), { tipo: "etiqueta", name: "Urgente" });
    expect(result.ok).toBe(false);
  });

  it("un filtro con query inválida se rechaza antes de guardar", async () => {
    const insertSpy = vi.fn();
    const supabase = fakeSupabase({ insertSpies: { filters: insertSpy } });

    const result = await crear(supabase, { tipo: "filtro", name: "Rota", color: "azul", query: "priority:" });
    expect(result.ok).toBe(false);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("crea un filtro con query válida", async () => {
    const insertSpy = vi.fn();
    const supabase = fakeSupabase({ insertSpies: { filters: insertSpy } });

    const result = await crear(supabase, { tipo: "filtro", name: "Vencidas", color: "azul", query: "due:overdue" });
    expect(result.ok).toBe(true);
    expect(insertSpy).toHaveBeenCalled();
  });

  it("un tipo desconocido se rechaza con un mensaje que lista los valores válidos", async () => {
    const result = await crear(fakeSupabase(), { tipo: "seccion", name: "x" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/proyecto.*habito.*etiqueta.*filtro/);
  });
});
