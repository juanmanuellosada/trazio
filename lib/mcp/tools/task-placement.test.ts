import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { validateTaskPlacement } from "./task-placement";

const P1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const P2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const S1 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const S2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const ROOT = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const CHILD = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
const GRANDCHILD = "cccccccc-cccc-4ccc-8ccc-ccccccccccc3";
const OTHER_PROJECT_TASK = "cccccccc-cccc-4ccc-8ccc-ccccccccccc4";

type Row = Record<string, unknown>;

/** Base en memoria mínima: select + eq/in + maybeSingle/single. */
function memoryDb(tables: Record<string, Row[]>) {
  const from = (table: string) => ({
    select: () => {
      const filters: ((r: Row) => boolean)[] = [];
      const run = () => (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
      const b = {
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), b),
        in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), b),
        maybeSingle: () => Promise.resolve({ data: run()[0] ?? null, error: null }),
        single: () => Promise.resolve({ data: run()[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: run(), error: null }),
      };
      return b;
    },
  });
  return { from } as unknown as SupabaseClient<Database>;
}

const db = () =>
  memoryDb({
    projects: [{ id: P1 }, { id: P2 }],
    sections: [
      { id: S1, project_id: P1 },
      { id: S2, project_id: P2 },
    ],
    tasks: [
      { id: ROOT, project_id: P1, section_id: null, parent_id: null },
      { id: CHILD, project_id: P1, section_id: null, parent_id: ROOT },
      { id: GRANDCHILD, project_id: P1, section_id: null, parent_id: CHILD },
      { id: OTHER_PROJECT_TASK, project_id: P2, section_id: null, parent_id: null },
    ],
  });

describe("validateTaskPlacement", () => {
  it("acepta una ubicación válida", async () => {
    expect(await validateTaskPlacement(db(), { project_id: P1, section_id: S1, parent_id: ROOT }, CHILD)).toEqual({ ok: true });
  });

  it("rechaza un proyecto que no existe", async () => {
    const r = await validateTaskPlacement(db(), { project_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", section_id: null, parent_id: null });
    expect(r).toEqual({ ok: false, error: expect.stringContaining("project_id") });
  });

  it("rechaza una sección de otro proyecto", async () => {
    const r = await validateTaskPlacement(db(), { project_id: P1, section_id: S2, parent_id: null });
    expect(r).toEqual({ ok: false, error: expect.stringContaining("section_id") });
  });

  it("rechaza ser el propio padre", async () => {
    const r = await validateTaskPlacement(db(), { project_id: P1, section_id: null, parent_id: ROOT }, ROOT);
    expect(r).toEqual({ ok: false, error: expect.stringContaining("propia tarea") });
  });

  it("rechaza un descendiente como padre (ciclo)", async () => {
    const r = await validateTaskPlacement(db(), { project_id: P1, section_id: null, parent_id: GRANDCHILD }, ROOT);
    expect(r).toEqual({ ok: false, error: expect.stringContaining("ciclo") });
  });

  it("rechaza un padre de otro proyecto", async () => {
    const r = await validateTaskPlacement(db(), { project_id: P1, section_id: null, parent_id: OTHER_PROJECT_TASK }, CHILD);
    expect(r).toEqual({ ok: false, error: expect.stringContaining("otro proyecto") });
  });

  it("rechaza un padre que no existe", async () => {
    const r = await validateTaskPlacement(db(), { project_id: P1, section_id: null, parent_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" });
    expect(r).toEqual({ ok: false, error: expect.stringContaining("parent_id") });
  });
});
