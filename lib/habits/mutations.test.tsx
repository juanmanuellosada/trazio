// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { playCompletionSound } from "@/lib/completion-sound";
import { habitCompletionsForRangeQueryKey } from "./completions";
import { useMarkHabitDone, useUnmarkHabitDone } from "./mutations";
import { habitsQueryKey } from "./use-habits";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@/lib/completion-sound", () => ({ playCompletionSound: vi.fn() }));

/**
 * Un `.from(table)` por tabla en vez de uno genérico (tarea 6.4, ampliado
 * para verificar que `useMarkHabitDone` también borra el salteo del día en
 * `habit_skips`, no solo inserta en `habit_completions`): las pruebas de
 * sonido de abajo no distinguen tabla y siguen viendo el mismo
 * insert/delete de siempre, mientras que `tables` deja inspeccionar qué se
 * llamó en cada una.
 */
function createSupabaseMock() {
  const tables: Record<string, { insert: ReturnType<typeof vi.fn>; deleteEq2: ReturnType<typeof vi.fn> }> = {};
  const from = vi.fn((table: string) => {
    if (!tables[table]) {
      tables[table] = {
        insert: vi.fn(() => Promise.resolve({ error: null })),
        deleteEq2: vi.fn(() => Promise.resolve({ error: null })),
      };
    }
    const t = tables[table];
    return {
      insert: t.insert,
      delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: t.deleteEq2 })) })),
    };
  });
  return { from, tables };
}

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const mock = createSupabaseMock();
(supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
  from: mock.from,
  auth: { getSession: vi.fn(() => Promise.resolve({ data: { session: { user: { id: "user-1" } } } })) },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

/** Mismo patrón que `wrapperWithUndo` en `lib/tasks/mutations.test.tsx`: expone el `QueryClient` para sembrar caché antes de mutar y leerla después. */
function wrapperWithClient(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/**
 * `sonido-al-completar` (D-E, tarea 2.4): marcar un hábito no tiene
 * deshacer, así que el sonido es la única confirmación de que el clic
 * llegó — por eso importa más acá que en tareas. Marcar suena, desmarcar
 * no: son dos mutaciones distintas, la distinción sale sola.
 */
describe("useMarkHabitDone / useUnmarkHabitDone — sonido al completar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // `assertNotFuture` (lib/habits/mutations.ts) compara contra el reloj
    // real: sin fijarlo, esta fecha queda vieja apenas cambia el día y la
    // mutación rechaza por "día futuro" en vez de llegar a `isSuccess`.
    vi.setSystemTime(new Date("2026-08-02T12:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marcar un hábito reproduce el sonido de confirmación", async () => {
    const { result } = renderHook(() => useMarkHabitDone(), { wrapper });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-02", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(playCompletionSound).toHaveBeenCalledTimes(1);
  });

  it("desmarcar un hábito nunca reproduce ningún sonido", async () => {
    const { result } = renderHook(() => useUnmarkHabitDone(), { wrapper });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-02", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(playCompletionSound).not.toHaveBeenCalled();
  });
});

/**
 * Tarea 6.2/6.4 (`calendario-legible-y-manipulable`, D-F): completar un
 * hábito borra el salteo de ese mismo día, para que "pendiente / cumplido
 * / salteado" nunca coexistan en la base. `useUnmarkHabitDone` no toca
 * `habit_skips`: desmarcar vuelve a pendiente, no a salteado.
 */
describe("useMarkHabitDone — limpia el salteo del día", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-08-02T12:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marcar un hábito hecho inserta en habit_completions y borra el salteo del día en habit_skips", async () => {
    const { result } = renderHook(() => useMarkHabitDone(), { wrapper });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-02", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.tables.habit_completions.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      habit_id: "h1",
      completed_on: "2026-08-02",
    });
    expect(mock.tables.habit_skips.deleteEq2).toHaveBeenCalledTimes(1);
  });

  it("desmarcar un hábito no toca habit_skips", async () => {
    const { result } = renderHook(() => useUnmarkHabitDone(), { wrapper });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-02", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.from).not.toHaveBeenCalledWith("habit_skips");
  });
});

/**
 * Decisión del dueño (`docs/decisions.md`): un día pasado en que el hábito
 * tocaba se puede marcar y desmarcar desde el calendario; el futuro sigue
 * prohibido. Reemplaza la guarda vieja (`assertIsToday`, solo dejaba pasar
 * hoy) por `assertNotFuture`.
 */
describe("useMarkHabitDone / useUnmarkHabitDone — el pasado se puede corregir, el futuro sigue prohibido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-08-05T12:00:00-03:00")); // "hoy" = 2026-08-05
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marcar un día pasado tiene éxito e inserta con ese completed_on", async () => {
    const { result } = renderHook(() => useMarkHabitDone(), { wrapper });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-01", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.tables.habit_completions.insert).toHaveBeenCalledWith({
      user_id: "user-1",
      habit_id: "h1",
      completed_on: "2026-08-01",
    });
  });

  it("desmarcar un día pasado tiene éxito", async () => {
    const { result } = renderHook(() => useUnmarkHabitDone(), { wrapper });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-01", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.tables.habit_completions.deleteEq2).toHaveBeenCalledTimes(1);
  });

  it("marcar un día futuro se rechaza sin llegar a insertar", async () => {
    const { result } = renderHook(() => useMarkHabitDone(), { wrapper });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-06", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mock.tables.habit_completions?.insert).not.toHaveBeenCalled();
    expect((result.current.error as Error).message).toMatch(/día futuro/i);
  });

  it("desmarcar un día futuro se rechaza", async () => {
    const { result } = renderHook(() => useUnmarkHabitDone(), { wrapper });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-06", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

/**
 * Defecto corregido junto con el de pintado: los `onMutate` viejos
 * ignoraban `date` y siempre pisaban `completed_today` (la marca de HOY).
 * Con días pasados habilitados, marcar el lunes hubiera pintado el hábito
 * de HOY como hecho. `completed_today` solo se toca cuando `date` es hoy; la
 * caché por rango (`lib/habits/completions.ts`, la que lee el calendario)
 * se actualiza siempre, con la fecha real.
 */
describe("useMarkHabitDone / useUnmarkHabitDone — el optimista no confunde la fecha marcada con hoy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-08-05T12:00:00-03:00")); // "hoy" = 2026-08-05
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marcar un día pasado no toca completed_today", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(habitsQueryKey(), [{ id: "h1", completed_today: false }]);
    const { result } = renderHook(() => useMarkHabitDone(), { wrapper: wrapperWithClient(queryClient) });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-01", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(habitsQueryKey())).toEqual([{ id: "h1", completed_today: false }]);
  });

  it("marcar hoy sí actualiza completed_today (sin cambios de comportamiento)", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(habitsQueryKey(), [{ id: "h1", completed_today: false }]);
    const { result } = renderHook(() => useMarkHabitDone(), { wrapper: wrapperWithClient(queryClient) });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-05", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(habitsQueryKey())).toEqual([{ id: "h1", completed_today: true }]);
  });

  it("marcar un día pasado sí actualiza la caché por rango del calendario, con esa fecha", async () => {
    const queryClient = new QueryClient();
    const rangeKey = habitCompletionsForRangeQueryKey(["2026-08-01", "2026-08-05"]);
    queryClient.setQueryData(rangeKey, {});
    const { result } = renderHook(() => useMarkHabitDone(), { wrapper: wrapperWithClient(queryClient) });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-01", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(rangeKey)).toEqual({ "2026-08-01": { h1: true } });
  });

  it("desmarcar un día pasado no toca completed_today y limpia la caché por rango de esa fecha", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(habitsQueryKey(), [{ id: "h1", completed_today: false }]);
    const rangeKey = habitCompletionsForRangeQueryKey(["2026-08-01", "2026-08-05"]);
    queryClient.setQueryData(rangeKey, { "2026-08-01": { h1: true } });
    const { result } = renderHook(() => useUnmarkHabitDone(), { wrapper: wrapperWithClient(queryClient) });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-01", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(habitsQueryKey())).toEqual([{ id: "h1", completed_today: false }]);
    expect(queryClient.getQueryData(rangeKey)).toEqual({ "2026-08-01": {} });
  });
});
