// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { UndoProvider } from "@/components/providers/undo-provider";
import { useUpdateTask } from "@/lib/tasks/mutations";
import { PROJECTS_MUTATION_KEY } from "@/lib/projects/mutations";
import { SECTIONS_MUTATION_KEY } from "@/lib/sections/mutations";
import { COMMENTS_MUTATION_KEY } from "@/lib/comments/mutations";
import { REMINDERS_MUTATION_KEY } from "@/lib/reminders/mutations";
import { FILTERS_MUTATION_KEY } from "@/lib/filters/mutations";
import { HABITS_MUTATION_KEY } from "@/lib/habits/mutations";
import { habitsQueryKey } from "@/lib/habits/use-habits";
import { tasksQueryKey, type TaskRow } from "@/lib/tasks/use-tasks";
import {
  onCommentsRealtimeEvent,
  onFiltersRealtimeEvent,
  onHabitCompletionsRealtimeEvent,
  onHabitsRealtimeEvent,
  onProjectsRealtimeEvent,
  onRemindersRealtimeEvent,
  onSectionsRealtimeEvent,
  onTasksRealtimeEvent,
} from "./handlers";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

function task(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    project_id: "p1",
    section_id: null,
    parent_id: null,
    title: "Tarea",
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 1000,
    labels: [],
    ...overrides,
  };
}

/** Registra una mutación "en vuelo" que nunca resuelve durante el test, sin pasar por ningún hook — alcanza para probar el mecanismo de `isMutating` que usa la regla D3. */
function pendingMutation(queryClient: QueryClient, mutationKey: readonly string[]) {
  const mutation = queryClient.getMutationCache().build(queryClient, {
    mutationKey,
    mutationFn: () => new Promise(() => {}),
  });
  void mutation.execute(undefined);
}

describe("invalidateUnlessMutating — mecanismo de la regla D3 (bloque 10.3)", () => {
  it("sin mutación en vuelo, cada manejador invalida de inmediato", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(tasksQueryKey("p1"), [task({ id: "t1" })]);
    queryClient.setQueryData(["projects"], []);
    queryClient.setQueryData(["sections", "p1"], []);
    queryClient.setQueryData(["comments", "t1"], []);
    queryClient.setQueryData(["reminders", "task", "t1"], []);
    queryClient.setQueryData(["filters"], []);
    queryClient.setQueryData(habitsQueryKey(), []);

    onTasksRealtimeEvent(queryClient);
    onProjectsRealtimeEvent(queryClient);
    onSectionsRealtimeEvent(queryClient);
    onCommentsRealtimeEvent(queryClient);
    onRemindersRealtimeEvent(queryClient);
    onFiltersRealtimeEvent(queryClient);
    onHabitsRealtimeEvent(queryClient);
    onHabitCompletionsRealtimeEvent(queryClient);

    expect(queryClient.getQueryState(tasksQueryKey("p1"))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["projects"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["sections", "p1"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["comments", "t1"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["reminders", "task", "t1"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["filters"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(habitsQueryKey())?.isInvalidated).toBe(true);
  });

  it("con una mutación de projects en vuelo, el evento de projects no invalida", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["projects"], []);
    pendingMutation(queryClient, PROJECTS_MUTATION_KEY);

    onProjectsRealtimeEvent(queryClient);

    expect(queryClient.getQueryState(["projects"])?.isInvalidated).toBe(false);
  });

  it("con una mutación de sections en vuelo, el evento de sections no invalida", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["sections", "p1"], []);
    pendingMutation(queryClient, SECTIONS_MUTATION_KEY);

    onSectionsRealtimeEvent(queryClient);

    expect(queryClient.getQueryState(["sections", "p1"])?.isInvalidated).toBe(false);
  });

  it("con una mutación de comments en vuelo, el evento de comments no invalida", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["comments", "t1"], []);
    pendingMutation(queryClient, COMMENTS_MUTATION_KEY);

    onCommentsRealtimeEvent(queryClient);

    expect(queryClient.getQueryState(["comments", "t1"])?.isInvalidated).toBe(false);
  });

  it("con una mutación de reminders en vuelo, el evento de reminders no invalida", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["reminders", "task", "t1"], []);
    pendingMutation(queryClient, REMINDERS_MUTATION_KEY);

    onRemindersRealtimeEvent(queryClient);

    expect(queryClient.getQueryState(["reminders", "task", "t1"])?.isInvalidated).toBe(false);
  });

  it("con una mutación de filters en vuelo, el evento de filters no invalida", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["filters"], []);
    pendingMutation(queryClient, FILTERS_MUTATION_KEY);

    onFiltersRealtimeEvent(queryClient);

    expect(queryClient.getQueryState(["filters"])?.isInvalidated).toBe(false);
  });

  it("con una mutación de habits en vuelo, el evento de habits no invalida", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(habitsQueryKey(), []);
    pendingMutation(queryClient, HABITS_MUTATION_KEY);

    onHabitsRealtimeEvent(queryClient);

    expect(queryClient.getQueryState(habitsQueryKey())?.isInvalidated).toBe(false);
  });

  it("con una mutación de habits en vuelo, el evento de habit_completions tampoco invalida — comparten el mismo prefijo de caché", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(habitsQueryKey(), []);
    pendingMutation(queryClient, HABITS_MUTATION_KEY);

    onHabitCompletionsRealtimeEvent(queryClient);

    expect(queryClient.getQueryState(habitsQueryKey())?.isInvalidated).toBe(false);
  });
});

describe("onTasksRealtimeEvent — bloque 10.4, el test que justifica la regla D3", () => {
  let resolveUpdate: () => void;

  beforeEach(() => {
    vi.clearAllMocks();
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    const eq = vi.fn(() => ({
      then: (onFulfilled: (value: { error: null }) => void) => {
        void updatePromise.then(() => onFulfilled({ error: null }));
      },
    }));
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({ update: vi.fn(() => ({ eq })) })),
    });
  });

  function wrapper(queryClient: QueryClient) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <UndoProvider>{children}</UndoProvider>
        </QueryClientProvider>
      );
    };
  }

  it("un evento de Realtime durante una mutación en vuelo no la pisa: sin invalidación en el acto, sin parpadeo — la invalidación llega recién con el onSettled de la mutación", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(tasksQueryKey("p1"), [task({ id: "t1", title: "Original" })]);

    const { result } = renderHook(() => useUpdateTask(), { wrapper: wrapper(queryClient) });

    act(() => {
      result.current.mutate({ id: "t1", projectId: "p1", patch: { title: "Nuevo" } });
    });

    // El valor optimista ya se aplicó (`onMutate` corre síncrono, antes de que `update()` resuelva).
    await waitFor(() => {
      const data = queryClient.getQueryData<TaskRow[]>(tasksQueryKey("p1"));
      expect(data?.[0].title).toBe("Nuevo");
    });

    // Llega el evento de Realtime mientras el `update()` real todavía no resolvió.
    onTasksRealtimeEvent(queryClient);

    // Sin invalidación en el acto: la interfaz sigue mostrando el valor optimista, no vuelve atrás.
    expect(queryClient.getQueryState(tasksQueryKey("p1"))?.isInvalidated).toBe(false);
    expect(queryClient.getQueryData<TaskRow[]>(tasksQueryKey("p1"))?.[0].title).toBe("Nuevo");

    // El servidor responde recién ahora.
    resolveUpdate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // El `onSettled` de la mutación (no el manejador de Realtime) es quien invalidó.
    expect(queryClient.getQueryState(tasksQueryKey("p1"))?.isInvalidated).toBe(true);
  });
});
