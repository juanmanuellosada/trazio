import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { completarTarea } from "./completar-tarea";

const ID = "11111111-1111-4111-8111-111111111111";
const NEXT_ID = "22222222-2222-4222-8222-222222222222";

/**
 * `createNextRecurringOccurrence` (`lib/recurrence/create-next-occurrence.ts`,
 * reusada tal cual — no reimplementada acá) hace su propia serie de
 * `.from("tasks")`/`.from("user_preferences")`/`.from("task_labels")`. Este
 * fake cubre exactamente lo que esa función pide, según si la tarea de
 * `taskRow` tiene `recurrence_rule` o no.
 */
function fakeSupabase(opts: {
  missing?: boolean;
  updateSpy?: (payload: unknown) => void;
  taskRow?: Record<string, unknown>;
}) {
  let taskSelectCalls = 0;
  const from = (table: string) => {
    if (table === "tasks") {
      return {
        select: (columns: string) => {
          // Primera vez (entityExists, "id" solo): `.eq().maybeSingle()`. Segunda
          // vez (createNextRecurringOccurrence, columnas completas): `.eq().single()`.
          if (columns === "id") {
            return { eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.missing ? null : { id: ID }, error: null }) }) };
          }
          taskSelectCalls += 1;
          return { eq: () => ({ single: () => Promise.resolve({ data: opts.taskRow, error: null }) }) };
        },
        update: (patch: unknown) => {
          opts.updateSpy?.(patch);
          return { eq: () => Promise.resolve({ error: null }) };
        },
        insert: () => ({
          select: () => ({ single: () => Promise.resolve({ data: { id: NEXT_ID, updated_at: "2026-08-10T00:00:00Z" }, error: null }) }),
        }),
      };
    }
    if (table === "user_preferences") {
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { timezone: "America/Argentina/Buenos_Aires" }, error: null }) }) }) };
    }
    if (table === "task_labels") {
      return { insert: () => Promise.resolve({ error: null }) };
    }
    throw new Error(`Tabla sin fake configurado: ${table}`);
  };
  return { from, taskSelectCalls: () => taskSelectCalls } as unknown as SupabaseClient<Database> & { taskSelectCalls: () => number };
}

const NON_RECURRING_ROW = {
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
  task_labels: [],
};

describe("completarTarea", () => {
  it("un id con formato inválido se rechaza antes de tocar la base", async () => {
    const result = await completarTarea(fakeSupabase({}), { id: "no-es-uuid", completado: true });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/UUID/);
  });

  it("un id que no existe (o de otra cuenta) da un error legible", async () => {
    const result = await completarTarea(fakeSupabase({ missing: true }), { id: ID, completado: true });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.error).toMatch(/no se encontró/i);
  });

  it("completar una tarea no recurrente no crea ninguna ocurrencia adicional", async () => {
    const updateSpy = vi.fn();
    const supabase = fakeSupabase({ updateSpy, taskRow: NON_RECURRING_ROW });

    const result = await completarTarea(supabase, { id: ID, completado: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.next_occurrence_id).toBeNull();
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ completed_at: expect.any(String) }));
  });

  it("completar una tarea recurrente crea la siguiente ocurrencia de la serie", async () => {
    const updateSpy = vi.fn();
    const recurringRow = { ...NON_RECURRING_ROW, recurrence_rule: "FREQ=DAILY", due_date: "2026-08-10" };
    const supabase = fakeSupabase({ updateSpy, taskRow: recurringRow });

    const result = await completarTarea(supabase, { id: ID, completado: true });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.next_occurrence_id).toBe(NEXT_ID);
  });

  it("descompletar nunca crea una ocurrencia ni llama a createNextRecurringOccurrence", async () => {
    const updateSpy = vi.fn();
    const supabase = fakeSupabase({ updateSpy, taskRow: { ...NON_RECURRING_ROW, recurrence_rule: "FREQ=DAILY" } });

    const result = await completarTarea(supabase, { id: ID, completado: false });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.next_occurrence_id).toBeNull();
    expect(updateSpy).toHaveBeenCalledWith({ completed_at: null });
    expect(supabase.taskSelectCalls()).toBe(0); // nunca llegó a leer la tarea completa: createNextRecurringOccurrence no se invocó
  });
});
