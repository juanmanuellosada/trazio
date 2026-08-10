import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { crearTarea } from "./crear-tarea";

const NOW = new Date("2026-08-10T12:00:00Z"); // 09:00 en America/Argentina/Buenos_Aires

const INBOX = { id: "inbox", name: "Bandeja de entrada", parent_id: null, icon: null, is_inbox: true, is_archived: false };
const TRABAJO = { id: "p1", name: "Trabajo", parent_id: null, icon: null, is_inbox: false, is_archived: false };

type FakeOpts = {
  userId?: string;
  preferences?: { timezone: string; week_starts_on: number } | null;
  projects?: unknown[];
  sections?: unknown[];
  labels?: unknown[];
  createdLabelId?: string;
  taskRow?: Record<string, unknown>;
  taskInsertSpy?: (payload: unknown) => void;
  labelInsertSpy?: (payload: unknown) => void;
  taskLabelsInsertSpy?: (payload: unknown) => void;
};

const DEFAULT_TASK_ROW = {
  id: "t1",
  project_id: INBOX.id,
  section_id: null,
  parent_id: null,
  title: "Llamar",
  description: null,
  priority: 4,
  due_date: null,
  due_at: null,
  duration_minutes: null,
  deadline: null,
  completed_at: null,
  position: 1000,
};

/** Fake de `.from(tabla)` por tabla, mismo patrón que el resto de `lib/mcp/tools/*.test.ts`. */
function fakeSupabase(opts: FakeOpts = {}) {
  const userId = opts.userId ?? "user-1";
  const taskRow = opts.taskRow ?? DEFAULT_TASK_ROW;

  const from = (table: string) => {
    if (table === "user_preferences") {
      return { select: () => ({ maybeSingle: () => Promise.resolve({ data: opts.preferences ?? null, error: null }) }) };
    }
    if (table === "projects") {
      return { select: () => Promise.resolve({ data: opts.projects ?? [INBOX], error: null }) };
    }
    if (table === "sections") {
      return { select: () => Promise.resolve({ data: opts.sections ?? [], error: null }) };
    }
    if (table === "labels") {
      return {
        select: () => Promise.resolve({ data: opts.labels ?? [], error: null }),
        insert: (row: { name: string; color: string }) => {
          opts.labelInsertSpy?.(row);
          return {
            select: () => ({
              single: () =>
                Promise.resolve({ data: { id: opts.createdLabelId ?? "new-label", name: row.name, color: row.color }, error: null }),
            }),
          };
        },
      };
    }
    if (table === "tasks") {
      return {
        insert: (payload: Record<string, unknown>) => {
          opts.taskInsertSpy?.(payload);
          // Simula el round-trip real: los campos que sí vinieron en el insert
          // pisan el default (una columna omitida, como `priority: undefined`
          // cuando el parser no la reconoce, deja el default de la columna).
          const defined = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
          const row = opts.taskRow ?? { ...taskRow, ...defined };
          return { select: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) };
        },
      };
    }
    if (table === "task_labels") {
      return {
        insert: (rows: unknown) => {
          opts.taskLabelsInsertSpy?.(rows);
          return Promise.resolve({ error: null });
        },
      };
    }
    throw new Error(`Tabla sin fake configurado: ${table}`);
  };

  const auth = { getUser: () => Promise.resolve({ data: { user: { id: userId } }, error: null }) };
  return { from, auth } as unknown as SupabaseClient<Database>;
}

describe("crearTarea", () => {
  it("produce los mismos atributos que reconoce el parser del alta rápida (fecha, hora, prioridad)", async () => {
    const taskInsertSpy = vi.fn();
    const supabase = fakeSupabase({ taskInsertSpy });

    const result = await crearTarea(supabase, { texto: "Llamar mañana a las 10 p1" }, NOW);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.task.title).toBe("Llamar");
    expect(result.task.priority).toBe(1);
    expect(result.task.due_at).not.toBeNull();
    expect(result.task.due_date).toBeNull();

    const payload = taskInsertSpy.mock.calls[0][0];
    expect(payload.priority).toBe(1);
    expect(payload.title).toBe("Llamar");
  });

  it("nunca manda position: la base la asigna sola (D-F)", async () => {
    const taskInsertSpy = vi.fn();
    const supabase = fakeSupabase({ taskInsertSpy });

    await crearTarea(supabase, { texto: "Comprar pan" }, NOW);

    const payload = taskInsertSpy.mock.calls[0][0];
    expect("position" in payload).toBe(false);
  });

  it("sin proyecto en el texto ni project_id, la tarea va a la Bandeja de entrada", async () => {
    const taskInsertSpy = vi.fn();
    const supabase = fakeSupabase({ taskInsertSpy, projects: [INBOX, TRABAJO] });

    await crearTarea(supabase, { texto: "Comprar pan" }, NOW);

    expect(taskInsertSpy.mock.calls[0][0].project_id).toBe(INBOX.id);
  });

  it("project_id explícito se usa cuando el texto no reconoce #proyecto", async () => {
    const taskInsertSpy = vi.fn();
    const supabase = fakeSupabase({ taskInsertSpy, projects: [INBOX, TRABAJO] });

    await crearTarea(supabase, { texto: "Comprar pan", project_id: TRABAJO.id }, NOW);

    expect(taskInsertSpy.mock.calls[0][0].project_id).toBe(TRABAJO.id);
  });

  it("#proyecto reconocido en el texto gana sobre project_id explícito", async () => {
    const taskInsertSpy = vi.fn();
    const supabase = fakeSupabase({
      taskInsertSpy,
      projects: [INBOX, { ...TRABAJO }],
    });

    await crearTarea(supabase, { texto: "Comprar pan #Trabajo", project_id: INBOX.id }, NOW);

    expect(taskInsertSpy.mock.calls[0][0].project_id).toBe(TRABAJO.id);
  });

  it("@etiqueta nueva crea la etiqueta y la asocia a la tarea; #proyecto inexistente nunca crea el proyecto", async () => {
    const labelInsertSpy = vi.fn();
    const taskLabelsInsertSpy = vi.fn();
    // `from("projects")` de este fake solo expone `.select` (ver arriba): si el código intentara
    // `.insert` sobre proyectos, la llamada rompería acá mismo.
    const supabase = fakeSupabase({ labelInsertSpy, taskLabelsInsertSpy, createdLabelId: "l-new" });

    const result = await crearTarea(supabase, { texto: "Comprar pan @compras #no-existe" }, NOW);

    expect(result.ok).toBe(true);
    expect(labelInsertSpy).toHaveBeenCalledWith(expect.objectContaining({ name: "compras" }));
    expect(taskLabelsInsertSpy).toHaveBeenCalledWith([expect.objectContaining({ label_id: "l-new" })]);
  });

  it("una description en texto plano se manda tal cual, sin conversión", async () => {
    const taskInsertSpy = vi.fn();
    const supabase = fakeSupabase({ taskInsertSpy });

    await crearTarea(supabase, { texto: "Comprar pan", description: "Notas\nvarias" }, NOW);

    expect(taskInsertSpy.mock.calls[0][0].description).toBe("Notas\nvarias");
  });

  it("un documento de Tiptap válido se manda tal cual y se puede leer de vuelta como texto", async () => {
    const taskInsertSpy = vi.fn();
    const doc = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "hola" }] }] };
    const supabase = fakeSupabase({
      taskInsertSpy,
      taskRow: { ...DEFAULT_TASK_ROW, description: doc },
    });

    const result = await crearTarea(supabase, { texto: "Comprar pan", description: doc }, NOW);

    expect(taskInsertSpy.mock.calls[0][0].description).toEqual(doc);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.task.description).toBe("hola");
  });

  it("una description con forma inválida se rechaza y la tarea nunca se crea", async () => {
    const taskInsertSpy = vi.fn();
    const supabase = fakeSupabase({ taskInsertSpy });

    const result = await crearTarea(supabase, { texto: "Comprar pan", description: { text: "hola" } }, NOW);

    expect(result.ok).toBe(false);
    expect(taskInsertSpy).not.toHaveBeenCalled();
  });
});
