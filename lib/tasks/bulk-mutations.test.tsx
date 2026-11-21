// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { UndoProvider } from "@/components/providers/undo-provider";
import { playCompletionSound, playUncompletionSound } from "@/lib/completion-sound";
import { toastError } from "@/lib/toast";
import { useBulkDeleteTasks, useBulkMoveTasks, useBulkUpdateTasks } from "./mutations";
import { tasksQueryKey, type TaskRow } from "./use-tasks";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@/lib/completion-sound", () => ({ playCompletionSound: vi.fn(), playUncompletionSound: vi.fn() }));

vi.mock("./restore", () => ({
  snapshotTaskSubtree: vi.fn(async (_supabase: unknown, rootId: string) => ({
    tasks: [{ id: rootId }],
    labelLinks: [],
    comments: [],
    reminders: [],
  })),
  restoreTaskSnapshot: vi.fn(async () => {}),
}));

function baseTask(id: string, projectId: string): TaskRow {
  return {
    id,
    project_id: projectId,
    section_id: null,
    parent_id: null,
    title: `Tarea ${id}`,
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 1000,
    labels: [],
  };
}

/** `update().in()` y `delete().in()`, que es lo único que usan las mutaciones en lote sobre `tasks` en estos tests. */
function createSupabaseMock() {
  const updateCalls: Array<{ patch: Record<string, unknown>; ids: string[] }> = [];
  const deleteCalls: string[][] = [];

  const from = vi.fn(() => ({
    update: vi.fn((patch: Record<string, unknown>) => ({
      in: vi.fn((_col: string, ids: string[]) => {
        updateCalls.push({ patch, ids });
        return Promise.resolve({ error: null });
      }),
      eq: vi.fn((_col: string, id: string) => {
        updateCalls.push({ patch, ids: [id] });
        return Promise.resolve({ error: null });
      }),
    })),
    delete: vi.fn(() => ({
      in: vi.fn((_col: string, ids: string[]) => {
        deleteCalls.push(ids);
        return Promise.resolve({ error: null });
      }),
    })),
  }));

  return { from, updateCalls, deleteCalls };
}

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const mock = createSupabaseMock();
(supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from: mock.from }));

/**
 * Base en memoria para probar los efectos persistidos: `select`/`update`/
 * `delete` con filtros `eq`/`in`, `insert`, `rpc` y sesión. `failUpdate`
 * decide si una actualización concreta la rechaza la base.
 */
type DbRow = Record<string, unknown>;
type FakeDbOptions = {
  failUpdate?: (table: string, patch: DbRow, ids: unknown[]) => boolean;
  failInsert?: (table: string) => boolean;
};

function fakeDb(tables: Record<string, DbRow[]>, options: FakeDbOptions = {}) {
  function builder(table: string) {
    const store = tables[table] ?? (tables[table] = []);
    const filters: Array<(row: DbRow) => boolean> = [];
    let mode: "select" | "update" | "delete" = "select";
    let patch: DbRow = {};
    const api = {
      select: () => api,
      update: (p: DbRow) => {
        mode = "update";
        patch = p;
        return api;
      },
      delete: () => {
        mode = "delete";
        return api;
      },
      eq: (col: string, val: unknown) => {
        filters.push((row) => row[col] === val);
        return api;
      },
      in: (col: string, vals: unknown[]) => {
        filters.push((row) => vals.includes(row[col]));
        return api;
      },
      single: async () => {
        const [match] = store.filter((row) => filters.every((f) => f(row)));
        return match ? { data: { ...match }, error: null } : { data: null, error: { message: "no encontrado" } };
      },
      insert: async (payload: DbRow | DbRow[]) => {
        if (options.failInsert?.(table)) return { error: { message: "rechazado" } };
        store.push(...(Array.isArray(payload) ? payload : [payload]).map((r) => ({ ...r })));
        return { error: null };
      },
      then: (resolve: (v: { data: DbRow[] | null; error: { message: string } | null }) => void) => {
        const matching = store.filter((row) => filters.every((f) => f(row)));
        if (mode === "update") {
          if (options.failUpdate?.(table, patch, matching.map((r) => r.id))) {
            return resolve({ data: null, error: { message: "rechazado" } });
          }
          for (const row of matching) Object.assign(row, patch);
          return resolve({ data: null, error: null });
        }
        if (mode === "delete") {
          for (const row of matching) store.splice(store.indexOf(row), 1);
          return resolve({ data: null, error: null });
        }
        resolve({ data: matching.map((r) => ({ ...r })), error: null });
      },
    };
    return api;
  }

  return {
    from: (table: string) => builder(table),
    rpc: async () => ({ error: null }),
    auth: { getSession: async () => ({ data: { session: { user: { id: "u1" } } } }) },
  };
}

function pressUndoShortcut() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
}

function wrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <UndoProvider>{children}</UndoProvider>
      </QueryClientProvider>
    );
  };
}

describe("useBulkUpdateTasks — una sola entrada de deshacer para todo el lote (bloque 7.12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.updateCalls.length = 0;
  });

  it("cambiar la prioridad de 3 tareas y deshacer las restaura a las 3 de una vez, con un solo Ctrl/Cmd+Z", async () => {
    const queryClient = new QueryClient();
    const tasks = [baseTask("t1", "p1"), baseTask("t2", "p1"), baseTask("t3", "p2")];
    queryClient.setQueryData(tasksQueryKey("p1"), [tasks[0], tasks[1]]);
    queryClient.setQueryData(tasksQueryKey("p2"), [tasks[2]]);

    const { result } = renderHook(() => useBulkUpdateTasks(), { wrapper: wrapper(queryClient) });

    act(() => {
      result.current.mutate({
        tasks: [
          { id: "t1", projectId: "p1" },
          { id: "t2", projectId: "p1" },
          { id: "t3", projectId: "p2" },
        ],
        patch: { priority: 1 },
      });
    });

    await waitFor(() => expect(mock.updateCalls).toHaveLength(1));
    expect(mock.updateCalls[0].ids.sort()).toEqual(["t1", "t2", "t3"]);
    expect(mock.updateCalls[0].patch).toEqual({ priority: 1 });

    act(() => pressUndoShortcut());

    // El deshacer revierte las 3 tareas con un solo `Ctrl/Cmd+Z`: 3 updates
    // más (uno por tarea, cada uno a su prioridad anterior), no 3 entradas
    // separadas en la pila que exigirían 3 `Ctrl/Cmd+Z`.
    await waitFor(() => expect(mock.updateCalls).toHaveLength(4));
    const undoPatches = mock.updateCalls.slice(1);
    expect(undoPatches.every((c) => c.patch.priority === 4)).toBe(true);

    // Un segundo `Ctrl/Cmd+Z` no vuelve a deshacer lo mismo: ya salió de la pila.
    act(() => pressUndoShortcut());
    expect(mock.updateCalls).toHaveLength(4);
  });

  /**
   * `sonido-al-completar` (2.5, preventivo): el completar en lote no existe
   * hoy en la interfaz, pero esta mutación ya acepta cualquier `TaskPatch` —
   * si algún día trae `completed_at`, el sonido tiene que sonar una vez por
   * lote, nunca una vez por tarea.
   */
  it("un patch con completed_at reproduce el sonido una sola vez, sin importar cuántas tareas trae el lote", async () => {
    const queryClient = new QueryClient();
    const tasks = [baseTask("t1", "p1"), baseTask("t2", "p1"), baseTask("t3", "p2")];
    queryClient.setQueryData(tasksQueryKey("p1"), [tasks[0], tasks[1]]);
    queryClient.setQueryData(tasksQueryKey("p2"), [tasks[2]]);

    const { result } = renderHook(() => useBulkUpdateTasks(), { wrapper: wrapper(queryClient) });

    act(() => {
      result.current.mutate({
        tasks: [
          { id: "t1", projectId: "p1" },
          { id: "t2", projectId: "p1" },
          { id: "t3", projectId: "p2" },
        ],
        patch: { completed_at: "2026-08-02T12:00:00.000Z" },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(playCompletionSound).toHaveBeenCalledTimes(1);
    expect(playUncompletionSound).not.toHaveBeenCalled();
  });

  /**
   * `sonido-al-descompletar`: mismo razonamiento preventivo que el test de
   * arriba, para la otra dirección — si `patch` trae `completed_at: null`,
   * el sonido grave suena una vez por lote.
   */
  it("un patch con completed_at: null reproduce el sonido grave una sola vez, sin importar cuántas tareas trae el lote", async () => {
    const queryClient = new QueryClient();
    const tasks = [baseTask("t1", "p1"), baseTask("t2", "p1"), baseTask("t3", "p2")];
    queryClient.setQueryData(tasksQueryKey("p1"), [tasks[0], tasks[1]]);
    queryClient.setQueryData(tasksQueryKey("p2"), [tasks[2]]);

    const { result } = renderHook(() => useBulkUpdateTasks(), { wrapper: wrapper(queryClient) });

    act(() => {
      result.current.mutate({
        tasks: [
          { id: "t1", projectId: "p1" },
          { id: "t2", projectId: "p1" },
          { id: "t3", projectId: "p2" },
        ],
        patch: { completed_at: null },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(playUncompletionSound).toHaveBeenCalledTimes(1);
    expect(playCompletionSound).not.toHaveBeenCalled();
  });
});

describe("useBulkDeleteTasks — eliminar en lote (bloque 7.11/7.12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.deleteCalls.length = 0;
  });

  it("elimina las N tareas en una sola llamada y empuja una sola entrada de deshacer", async () => {
    const queryClient = new QueryClient();
    const ids = Array.from({ length: 12 }, (_, i) => `t${i}`);
    queryClient.setQueryData(
      tasksQueryKey("p1"),
      ids.map((id) => baseTask(id, "p1")),
    );

    const { result } = renderHook(() => useBulkDeleteTasks(), { wrapper: wrapper(queryClient) });

    act(() => {
      result.current.mutate({ tasks: ids.map((id) => ({ id, projectId: "p1" })) });
    });

    await waitFor(() => expect(mock.deleteCalls).toHaveLength(1));
    expect(mock.deleteCalls[0]).toHaveLength(12);

    const { restoreTaskSnapshot } = await import("./restore");
    act(() => pressUndoShortcut());

    // Un solo `Ctrl/Cmd+Z` dispara la restauración de las 12, no 12 deshacer separados.
    await waitFor(() => expect(restoreTaskSnapshot).toHaveBeenCalledTimes(12));
  });
});

describe("useBulkMoveTasks — mover en lote con foto de la base (requirements de `tareas` y `seleccion-multiple`)", () => {
  const createClient = supabaseClientModule.createClient as ReturnType<typeof vi.fn>;

  function seed(): Record<string, DbRow[]> {
    return {
      tasks: [
        { id: "t1", project_id: "p1", section_id: "s1", parent_id: null, position: 2000 },
        { id: "c1", project_id: "p1", section_id: "s2", parent_id: "t1", position: 1000 },
        { id: "c2", project_id: "p1", section_id: null, parent_id: "c1", position: 1000 },
        { id: "other", project_id: "p1", section_id: "s1", parent_id: null, position: 3000 },
      ],
    };
  }

  const byId = (tables: Record<string, DbRow[]>, id: string) => tables.tasks.find((t) => t.id === id);

  function useDb(tables: Record<string, DbRow[]>, options?: FakeDbOptions) {
    createClient.mockImplementation(() => fakeDb(tables, options));
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    createClient.mockImplementation(() => ({ from: mock.from }));
  });

  async function moveAndWait(queryClient: QueryClient) {
    const { result } = renderHook(() => useBulkMoveTasks(), { wrapper: wrapper(queryClient) });
    act(() => {
      result.current.mutate({ tasks: [{ id: "t1", projectId: "p1" }], toProjectId: "p2", toSectionId: null });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  }

  it("mover desde una vista que no cargó el proyecto de origen arrastra las subtareas de todos los niveles, sin sección", async () => {
    const tables = seed();
    useDb(tables);

    await moveAndWait(new QueryClient());

    expect(byId(tables, "t1")).toMatchObject({ project_id: "p2", section_id: null, parent_id: null });
    expect(byId(tables, "c1")).toMatchObject({ project_id: "p2", section_id: null });
    expect(byId(tables, "c2")).toMatchObject({ project_id: "p2", section_id: null });
    expect(byId(tables, "other")).toMatchObject({ project_id: "p1", section_id: "s1" });
  });

  it("deshacer devuelve la tarea y sus subtareas a su lugar de origen, aunque la lista de origen nunca se cargó", async () => {
    const tables = seed();
    useDb(tables);
    await moveAndWait(new QueryClient());

    act(() => pressUndoShortcut());

    await waitFor(() => expect(byId(tables, "c2")?.project_id).toBe("p1"));
    expect(byId(tables, "t1")).toMatchObject({ project_id: "p1", section_id: "s1", parent_id: null, position: 2000 });
    expect(byId(tables, "c1")).toMatchObject({ project_id: "p1", section_id: "s2" });
    expect(byId(tables, "c2")).toMatchObject({ project_id: "p1", section_id: null });
    expect(toastError).not.toHaveBeenCalled();
  });

  it("si falla mover una tarea posterior del lote, las ya movidas conservan sus subtareas en el proyecto destino", async () => {
    const tables = seed();
    useDb(tables, { failUpdate: (_table, patch, ids) => patch.project_id === "p2" && ids.includes("other") });

    const { result } = renderHook(() => useBulkMoveTasks(), { wrapper: wrapper(new QueryClient()) });
    act(() => {
      result.current.mutate({
        tasks: [
          { id: "t1", projectId: "p1" },
          { id: "other", projectId: "p1" },
        ],
        toProjectId: "p2",
        toSectionId: null,
      });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(byId(tables, "t1")?.project_id).toBe("p2");
    expect(byId(tables, "c1")).toMatchObject({ project_id: "p2", section_id: null });
    expect(byId(tables, "c2")).toMatchObject({ project_id: "p2", section_id: null });
    expect(byId(tables, "other")?.project_id).toBe("p1");
  });

  it("arrastra las subtareas aunque la interfaz crea que la tarea ya está en el proyecto destino", async () => {
    const tables = seed();
    useDb(tables);

    const { result } = renderHook(() => useBulkMoveTasks(), { wrapper: wrapper(new QueryClient()) });
    act(() => {
      // `projectId` viene del caché y está desactualizado: en la base la tarea sigue en p1.
      result.current.mutate({ tasks: [{ id: "t1", projectId: "p2" }], toProjectId: "p2", toSectionId: null });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(byId(tables, "c1")?.project_id).toBe("p2");
    expect(byId(tables, "c2")?.project_id).toBe("p2");
  });

  it("si el deshacer falla en varias actualizaciones, muestra un solo error", async () => {
    const tables = seed();
    useDb(tables, {
      failUpdate: (_table, patch, ids) => patch.project_id === "p1" && (ids.includes("c1") || ids.includes("c2")),
    });
    await moveAndWait(new QueryClient());

    act(() => pressUndoShortcut());

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1));
    // La raíz sí se pudo devolver: una falla no frena las demás.
    await waitFor(() => expect(byId(tables, "t1")?.project_id).toBe("p1"));
  });
});
