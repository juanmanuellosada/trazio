// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { UndoProvider } from "@/components/providers/undo-provider";
import { playCompletionSound, playUncompletionSound } from "@/lib/completion-sound";
import { useUpdateTask } from "./mutations";
import { taskDetailQueryKey, type TaskDetail } from "./use-task";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@/lib/completion-sound", () => ({ playCompletionSound: vi.fn(), playUncompletionSound: vi.fn() }));

/** Mock mínimo: solo `update().eq()`, que es todo lo que usa `useUpdateTask` acá (sin `completed_at`, no dispara `createNextRecurringOccurrence`). */
function createSupabaseMock() {
  const updateCalls: Array<{ table: string; patch: Record<string, unknown> }> = [];
  const from = vi.fn((table: string) => ({
    update: vi.fn((patch: Record<string, unknown>) => ({
      eq: vi.fn(() => {
        updateCalls.push({ table, patch });
        return Promise.resolve({ error: null });
      }),
    })),
  }));
  return { from, updateCalls };
}

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const mock = createSupabaseMock();
(supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from: mock.from }));

const baseTask: TaskDetail = {
  id: "t1",
  project_id: "p1",
  section_id: null,
  parent_id: null,
  title: "Sacar la basura",
  description: null,
  priority: 4,
  due_date: null,
  due_at: null,
  duration_minutes: null,
  deadline: null,
  completed_at: null,
  created_at: "2026-01-01T00:00:00Z",
  position: 1000,
  recurrence_rule: "FREQ=WEEKLY",
  recurrence_ends_at: "2026-08-16T02:59:59.999Z",
  recurrence_count: null,
  recurrence_anchor: null,
  labels: [],
};

/** Dispara el atajo de deshacer global que escucha `UndoProvider` (bloque 5.9). */
function pressUndoShortcut() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true }));
}

describe("useUpdateTask — deshacer una edición de recurrencia (bloque 5.11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.updateCalls.length = 0;
  });

  it("el parche inverso restaura los tres campos de recurrencia, leídos de TaskDetail", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(taskDetailQueryKey(baseTask.id), baseTask);

    function wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <UndoProvider>{children}</UndoProvider>
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useUpdateTask(), { wrapper });

    act(() => {
      result.current.mutate({
        id: baseTask.id,
        projectId: baseTask.project_id,
        patch: {
          recurrence_rule: "FREQ=DAILY",
          recurrence_ends_at: "2026-09-01T02:59:59.999Z",
          recurrence_count: 5,
        },
      });
    });

    await waitFor(() => expect(mock.updateCalls).toHaveLength(1));

    act(() => pressUndoShortcut());

    await waitFor(() => expect(mock.updateCalls).toHaveLength(2));
    expect(mock.updateCalls[1]?.patch).toEqual({
      recurrence_rule: baseTask.recurrence_rule,
      recurrence_ends_at: baseTask.recurrence_ends_at,
      recurrence_count: baseTask.recurrence_count,
    });
  });
});

/**
 * Fila de tarea recurrente que devuelve el mock de más abajo cuando
 * `createNextRecurringOccurrence` la lee (`.select(RECURRING_TASK_COLUMNS)`):
 * `FREQ=DAILY;INTERVAL=3` sin ningún `BY*` ancla en el completado
 * (`lib/recurrence/anchor.ts`), así que no depende de `due_date`/`due_at` —
 * siempre genera la siguiente instancia sin fin de serie.
 */
const RECURRING_TASK_ROW = {
  id: "t1",
  user_id: "user-1",
  project_id: "p1",
  section_id: null,
  title: "Regar las plantas",
  description: null,
  priority: 4,
  due_date: null,
  due_at: null,
  duration_minutes: null,
  deadline: null,
  recurrence_rule: "FREQ=DAILY;INTERVAL=3",
  recurrence_ends_at: null,
  recurrence_count: null,
  recurrence_anchor: null,
  position: 1000,
  task_labels: [],
};

const NEXT_OCCURRENCE_ID = "t1-siguiente";
const NEXT_OCCURRENCE_UPDATED_AT = "2026-07-13T00:00:00.000Z";

/**
 * Mock más completo que el de arriba: cubre todo lo que dispara completar
 * una recurrente y deshacerlo (bloque nuevo, cierre de fase 2) — el
 * `select()` de la propia tarea y de la zona horaria, el `insert()` de la
 * siguiente instancia, y la comprobación + `delete()` que hace el deshacer
 * si nadie tocó esa instancia todavía.
 *
 * `insertShouldFail` simula que la creación de la siguiente instancia falló
 * (bloque "si la creación falló, deshacer no borra nada"). `checkResult`
 * controla qué `updated_at` encuentra el deshacer al revisar si alguien ya
 * tocó la instancia nueva: igual al de la creación (nadie la tocó, se
 * borra), distinto (alguien la tocó, no se borra) o `null` (ya no existe).
 */
function createRecurrenceUndoMock(options: { insertShouldFail?: boolean; checkResult: string | null }) {
  const updateCalls: Array<{ patch: Record<string, unknown>; id: string }> = [];
  const deleteCalls: string[] = [];

  const from = vi.fn((table: string) => {
    if (table === "tasks") {
      return {
        update: vi.fn((patch: Record<string, unknown>) => ({
          eq: vi.fn((_col: string, id: string) => {
            updateCalls.push({ patch, id });
            return Promise.resolve({ error: null });
          }),
        })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: RECURRING_TASK_ROW, error: null })),
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: options.checkResult === null ? null : { updated_at: options.checkResult },
                error: null,
              }),
            ),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              options.insertShouldFail
                ? Promise.resolve({ data: null, error: { message: "no se pudo crear la siguiente instancia" } })
                : Promise.resolve({
                    data: { id: NEXT_OCCURRENCE_ID, updated_at: NEXT_OCCURRENCE_UPDATED_AT },
                    error: null,
                  }),
            ),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn((_col: string, id: string) => {
            deleteCalls.push(id);
            return Promise.resolve({ error: null });
          }),
        })),
      };
    }
    if (table === "user_preferences") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({ data: { timezone: "America/Argentina/Buenos_Aires" }, error: null }),
            ),
          })),
        })),
      };
    }
    throw new Error(`Tabla no mockeada en este test: ${table}`);
  });

  return { from, updateCalls, deleteCalls };
}

function wrapperWithUndo(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <UndoProvider>{children}</UndoProvider>
      </QueryClientProvider>
    );
  };
}

describe("useUpdateTask — deshacer completar una recurrente elimina la instancia que generó", () => {
  const recurringDetail: TaskDetail = { ...baseTask, id: "t1", completed_at: null };

  afterEach(() => {
    // Ninguna otra suite del archivo depende del mock por defecto durante
    // la ejecución de estos tests, pero se restaura igual para no dejar
    // implementaciones de `createClient` filtradas entre archivos.
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from: mock.from }));
  });

  it("nadie tocó la instancia nueva: deshacer la borra además de volver la original a pendiente", async () => {
    const recurrenceMock = createRecurrenceUndoMock({ checkResult: NEXT_OCCURRENCE_UPDATED_AT });
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: recurrenceMock.from,
    }));

    const queryClient = new QueryClient();
    queryClient.setQueryData(taskDetailQueryKey(recurringDetail.id), recurringDetail);

    const { result } = renderHook(() => useUpdateTask(), { wrapper: wrapperWithUndo(queryClient) });

    act(() => {
      result.current.mutate({
        id: recurringDetail.id,
        projectId: recurringDetail.project_id,
        patch: { completed_at: "2026-07-10T12:00:00.000Z" },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(recurrenceMock.deleteCalls).toHaveLength(0);

    act(() => pressUndoShortcut());

    await waitFor(() => expect(recurrenceMock.deleteCalls).toEqual([NEXT_OCCURRENCE_ID]));
    // La original vuelve a pendiente (parche inverso) además de borrarse la nueva.
    expect(recurrenceMock.updateCalls[1]).toEqual({ patch: { completed_at: null }, id: recurringDetail.id });
  });

  it("la creación de la siguiente falló: deshacer no intenta borrar nada", async () => {
    const recurrenceMock = createRecurrenceUndoMock({ insertShouldFail: true, checkResult: NEXT_OCCURRENCE_UPDATED_AT });
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: recurrenceMock.from,
    }));

    const queryClient = new QueryClient();
    queryClient.setQueryData(taskDetailQueryKey(recurringDetail.id), recurringDetail);

    const { result } = renderHook(() => useUpdateTask(), { wrapper: wrapperWithUndo(queryClient) });

    act(() => {
      result.current.mutate({
        id: recurringDetail.id,
        projectId: recurringDetail.project_id,
        patch: { completed_at: "2026-07-10T12:00:00.000Z" },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => pressUndoShortcut());

    await waitFor(() => expect(recurrenceMock.updateCalls).toHaveLength(2));
    expect(recurrenceMock.deleteCalls).toHaveLength(0);
  });

  it("la instancia nueva ya fue editada o completada: deshacer no la borra, conservador", async () => {
    const recurrenceMock = createRecurrenceUndoMock({ checkResult: "2026-07-14T00:00:00.000Z" });
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: recurrenceMock.from,
    }));

    const queryClient = new QueryClient();
    queryClient.setQueryData(taskDetailQueryKey(recurringDetail.id), recurringDetail);

    const { result } = renderHook(() => useUpdateTask(), { wrapper: wrapperWithUndo(queryClient) });

    act(() => {
      result.current.mutate({
        id: recurringDetail.id,
        projectId: recurringDetail.project_id,
        patch: { completed_at: "2026-07-10T12:00:00.000Z" },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => pressUndoShortcut());

    await waitFor(() => expect(recurrenceMock.updateCalls).toHaveLength(2));
    expect(recurrenceMock.deleteCalls).toHaveLength(0);
  });
});

/**
 * `sonido-al-completar`/`sonido-al-descompletar` (D-B/D-C): el sonido cuelga
 * del callback de éxito de esta mutación, condicionado a que el patch traiga
 * la clave `completed_at` — nunca a "la mutación de tarea salió bien". Cubre
 * completar, descompletar y el camino que más importa: el autoguardado de la
 * descripción, que pasa por este mismo `onSuccess` sin ningún gesto de
 * completar ni de descompletar.
 */
describe("useUpdateTask — sonido al completar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.updateCalls.length = 0;
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({ from: mock.from }));
  });

  it("completar una tarea reproduce el sonido de confirmación", async () => {
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useUpdateTask(), { wrapper: wrapperWithUndo(queryClient) });

    act(() => {
      result.current.mutate({
        id: baseTask.id,
        projectId: baseTask.project_id,
        patch: { completed_at: "2026-08-02T12:00:00.000Z" },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(playCompletionSound).toHaveBeenCalledTimes(1);
    expect(playUncompletionSound).not.toHaveBeenCalled();
  });

  it("descompletar una tarea reproduce el sonido grave, no el de completar", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(taskDetailQueryKey(baseTask.id), { ...baseTask, completed_at: "2026-08-01T00:00:00.000Z" });
    const { result } = renderHook(() => useUpdateTask(), { wrapper: wrapperWithUndo(queryClient) });

    act(() => {
      result.current.mutate({ id: baseTask.id, projectId: baseTask.project_id, patch: { completed_at: null } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(playUncompletionSound).toHaveBeenCalledTimes(1);
    expect(playCompletionSound).not.toHaveBeenCalled();
  });

  it("autoguardar la descripción nunca reproduce ningún sonido, aunque pase por el mismo callback", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(taskDetailQueryKey(baseTask.id), baseTask);
    const { result } = renderHook(() => useUpdateTask(), { wrapper: wrapperWithUndo(queryClient) });

    act(() => {
      result.current.mutate({
        id: baseTask.id,
        projectId: baseTask.project_id,
        patch: { description: { type: "doc", content: [] } },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(playCompletionSound).not.toHaveBeenCalled();
    expect(playUncompletionSound).not.toHaveBeenCalled();
  });

  it("deshacer un completar no reproduce ningún sonido (el undo pisa la fila directo, no pasa por este onSuccess)", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(taskDetailQueryKey(baseTask.id), baseTask);
    const { result } = renderHook(() => useUpdateTask(), { wrapper: wrapperWithUndo(queryClient) });

    act(() => {
      result.current.mutate({
        id: baseTask.id,
        projectId: baseTask.project_id,
        patch: { completed_at: "2026-08-02T12:00:00.000Z" },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(playCompletionSound).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    act(() => pressUndoShortcut());
    await waitFor(() => expect(mock.updateCalls).toHaveLength(2));

    expect(playCompletionSound).not.toHaveBeenCalled();
    expect(playUncompletionSound).not.toHaveBeenCalled();
  });
});
