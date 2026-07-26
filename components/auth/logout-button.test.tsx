// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutButton } from "./logout-button";

const signOut = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut } }),
}));

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

describe("LogoutButton", () => {
  beforeEach(() => {
    signOut.mockClear();
    push.mockReset();
    refresh.mockReset();
  });

  it("termina la sesión, limpia la caché de TanStack Query y redirige a la landing", async () => {
    const queryClient = new QueryClient();
    const clearSpy = vi.spyOn(queryClient, "clear");
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <LogoutButton />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(clearSpy).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
  });
});
