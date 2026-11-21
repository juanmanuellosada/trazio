// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useSearch } from "./use-search";


vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const self: Record<string, unknown> = {};
    for (const method of ["select", "textSearch", "order", "limit"]) self[method] = vi.fn(() => self);
    self.then = (_resolve: unknown, reject: (e: unknown) => void) => reject(new Error("sin conexión"));
    return { from: () => self };
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("useSearch — consulta fallida", () => {
  it("devuelve el estado de fallo, no se queda en buscando", async () => {
    const { result } = renderHook(() => useSearch("reunion"), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("fallo"));
  });
});
