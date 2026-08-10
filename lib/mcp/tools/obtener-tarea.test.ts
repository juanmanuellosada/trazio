import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { obtenerTarea } from "./obtener-tarea";

const TASK_ID = "11111111-1111-4111-8111-111111111111";
const SUBTASK_ID = "22222222-2222-4222-8222-222222222222";

const TASK_ROW = {
  id: TASK_ID,
  project_id: "project-1",
  section_id: null,
  parent_id: null,
  title: "Organizar el viaje",
  description: null,
  priority: 3,
  due_date: null,
  due_at: null,
  duration_minutes: null,
  deadline: null,
  completed_at: null,
  position: 1000,
  created_at: "2026-08-01T00:00:00Z",
  recurrence_rule: null,
  recurrence_ends_at: null,
  recurrence_count: null,
  recurrence_anchor: null,
  task_labels: [{ labels: { id: "l1", name: "Viajes", color: "azul" } }],
};

const SUBTASK_ROW = {
  id: SUBTASK_ID,
  project_id: "project-1",
  section_id: null,
  parent_id: TASK_ID,
  title: "Comprar pasajes",
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

/** Fake mínimo de `.from("tasks")` que devuelve una respuesta distinta según el orden de invocación: primera vez, el detalle de la tarea (`.maybeSingle()`); segunda vez, las subtareas (`.order()`). */
function fakeSupabase(taskResult: { data: unknown; error: unknown }, subtaskResult: { data: unknown; error: unknown }) {
  let call = 0;
  const from = vi.fn().mockImplementation(() => {
    call += 1;
    if (call === 1) {
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(taskResult) }) }) };
    }
    return { select: () => ({ eq: () => ({ order: () => Promise.resolve(subtaskResult) }) }) };
  });
  return { from } as unknown as SupabaseClient<Database>;
}

describe("obtenerTarea", () => {
  it("un id con formato inválido se rechaza antes de tocar la base, con un mensaje que señala el formato esperado", async () => {
    const supabase = fakeSupabase({ data: null, error: null }, { data: [], error: null });
    const result = await obtenerTarea(supabase, { id: "no-existe" });

    expect(result).toEqual({
      ok: false,
      error: 'El id "no-existe" no tiene el formato de un UUID válido, por ejemplo "3fa85f64-5717-4562-b3fc-2c963f66afa6".',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("un id bien formado pero inexistente (o de otra cuenta, indistinguible por RLS) devuelve un error legible, no una excepción", async () => {
    const supabase = fakeSupabase({ data: null, error: null }, { data: [], error: null });
    const result = await obtenerTarea(supabase, { id: TASK_ID });
    expect(result).toEqual({ ok: false, error: "No se encontró una tarea con ese id." });
  });

  it("trae el detalle completo con sus subtareas y sus etiquetas", async () => {
    const supabase = fakeSupabase({ data: TASK_ROW, error: null }, { data: [SUBTASK_ROW], error: null });
    const result = await obtenerTarea(supabase, { id: TASK_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.task.id).toBe(TASK_ID);
    expect(result.task.labels).toEqual([{ id: "l1", name: "Viajes", color: "azul" }]);
    expect(result.task.subtasks).toHaveLength(1);
    expect(result.task.subtasks[0].id).toBe(SUBTASK_ID);
    // Nunca comentarios ni recordatorios: ningún campo de ese lado aparece en la forma devuelta.
    expect(result.task).not.toHaveProperty("comments");
    expect(result.task).not.toHaveProperty("reminders");
  });

  it("un error de la base al buscar la tarea se propaga, no se traga en silencio", async () => {
    const supabase = fakeSupabase({ data: null, error: new Error("boom") }, { data: [], error: null });
    await expect(obtenerTarea(supabase, { id: TASK_ID })).rejects.toThrow("boom");
  });
});
