// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { UndoProvider } from "@/components/providers/undo-provider";
import { useBulkDeleteTasks, useBulkUpdateTasks } from "./mutations";
import { tasksQueryKey, type TaskRow } from "./use-tasks";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

vi.mock("./restore", () => ({
  snapshotTaskSubtree: vi.fn(async (_supabase: unknown, rootId: string) => ({
    tasks: [{ id: rootId }],
    labelLinks: [],
    comments: [],
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
