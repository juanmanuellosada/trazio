// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { useHabitSkip, useSkipHabit, useUnskipHabit } from "./skips";

// Grupo 6 de calendario-legible-y-manipulable, D-F: "guardar, leer y
// revertir el estado salteado". `useSkipHabit` reusa `assertAppliesOnDate`
// (ya probada en schedule-overrides.test.ts) para rechazar un día que no le
// toca al hábito por su frecuencia — acá solo se verifica que la mutación
// la aplica de verdad, antes de tocar la red.

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

function createSupabaseMock() {
  const insert = vi.fn(() => Promise.resolve({ error: null }));
  const deleteEq2 = vi.fn(() => Promise.resolve({ error: null }));
  const maybeSingle = vi.fn(() => Promise.resolve<{ data: { habit_id: string } | null; error: null }>({ data: null, error: null }));
  const from = vi.fn(() => ({
    insert,
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: deleteEq2 })) })),
    select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })),
  }));
  return { from, insert, deleteEq2, maybeSingle };
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

const HABITO_DIARIO = {
  frequency_type: "daily" as const,
  days_of_week: null,
  created_at: "2026-07-01T00:00:00.000Z",
  is_archived: false,
};

describe("useSkipHabit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("guarda el salteo: inserta en habit_skips con el hábito, la fecha y el usuario de la sesión", async () => {
    const { result } = renderHook(() => useSkipHabit(), { wrapper });

    act(() => {
      result.current.mutate({ habitId: "h1", habit: HABITO_DIARIO, date: "2026-08-05", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.from).toHaveBeenCalledWith("habit_skips");
    expect(mock.insert).toHaveBeenCalledWith({ user_id: "user-1", habit_id: "h1", date: "2026-08-05" });
  });

  it("rechaza un día que no le corresponde al hábito por su frecuencia, sin tocar la red", async () => {
    const habitoLunes = { ...HABITO_DIARIO, frequency_type: "specific_days" as const, days_of_week: [1] };
    const { result } = renderHook(() => useSkipHabit(), { wrapper });

    act(() => {
      // 2026-08-05 es un miércoles; el hábito solo toca los lunes.
      result.current.mutate({ habitId: "h1", habit: habitoLunes, date: "2026-08-05", timezone: "America/Argentina/Buenos_Aires" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/según su frecuencia/);
    expect(mock.insert).not.toHaveBeenCalled();
  });
});

describe("useUnskipHabit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revierte el salteo: borra la fila de habit_skips para ese hábito y esa fecha", async () => {
    const { result } = renderHook(() => useUnskipHabit(), { wrapper });

    act(() => {
      result.current.mutate({ habitId: "h1", date: "2026-08-05" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.from).toHaveBeenCalledWith("habit_skips");
    expect(mock.deleteEq2).toHaveBeenCalledTimes(1);
  });
});

describe("useHabitSkip", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sin fila en habit_skips, el hábito no está salteado ese día", async () => {
    mock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const { result } = renderHook(() => useHabitSkip("h1", "2026-08-05"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it("con una fila en habit_skips, el hábito está salteado ese día", async () => {
    mock.maybeSingle.mockResolvedValueOnce({ data: { habit_id: "h1" }, error: null });
    const { result } = renderHook(() => useHabitSkip("h1", "2026-08-05"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });
});
