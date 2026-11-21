// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearch } from "./use-search";


const state = vi.hoisted(() => ({ fail: true }));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const self: Record<string, unknown> = {};
    for (const method of ["select", "textSearch", "order", "limit"]) self[method] = vi.fn(() => self);
    self.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
      state.fail ? reject(new Error("sin conexión")) : resolve({ data: [], error: null });
    return { from: () => self };
  },
}));

let queryClient: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useSearch — consulta fallida", () => {
  beforeEach(() => {
    state.fail = true;
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("devuelve el estado de fallo, no se queda en buscando", async () => {
    const { result } = renderHook(() => useSearch("reunion"), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("fallo"));
  });

  it("si falla una recarga en segundo plano, conserva los resultados que ya mostraba", async () => {
    state.fail = false;
    const { result } = renderHook(() => useSearch("reunion"), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("listo"));

    state.fail = true;
    await queryClient.refetchQueries({ queryKey: ["search"] });
    await waitFor(() =>
      expect(queryClient.getQueryCache().findAll({ queryKey: ["search"] })[0].state.status).toBe("error"),
    );

    expect(result.current.status).toBe("listo");
  });
});
