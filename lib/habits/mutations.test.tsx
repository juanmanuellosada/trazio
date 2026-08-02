// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { playCompletionSound } from "@/lib/completion-sound";
import { useMarkHabitDone, useUnmarkHabitDone } from "./mutations";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@/lib/completion-sound", () => ({ playCompletionSound: vi.fn() }));

function createSupabaseMock() {
  const from = vi.fn(() => ({
    insert: vi.fn(() => Promise.resolve({ error: null })),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) })),
  }));
  return { from };
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

/**
 * `sonido-al-completar` (D-E, tarea 2.4): marcar un hábito no tiene
 * deshacer, así que el sonido es la única confirmación de que el clic
 * llegó — por eso importa más acá que en tareas. Marcar suena, desmarcar
 * no: son dos mutaciones distintas, la distinción sale sola.
 */
describe("useMarkHabitDone / useUnmarkHabitDone — sonido al completar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
