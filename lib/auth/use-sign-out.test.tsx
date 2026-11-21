// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSignOut } from "./use-sign-out";

const calls: string[] = [];
const push = vi.fn();
const refresh = vi.fn();
const unsubscribeFromPush = vi.fn();
const signOutMock = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { signOut: signOutMock } }) }));
vi.mock("@/lib/reminders/subscribe", () => ({ unsubscribeFromPush: () => unsubscribeFromPush() }));

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("useSignOut — suscripción push", () => {
  beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
    unsubscribeFromPush.mockImplementation(async () => {
      calls.push("unsubscribe");
    });
    signOutMock.mockImplementation(async () => {
      calls.push("signOut");
    });
  });

  it("da de baja la suscripción push antes de cerrar la sesión", async () => {
    const { result } = renderHook(() => useSignOut(), { wrapper });
    await act(async () => {
      await result.current.signOut();
    });
    expect(calls).toEqual(["unsubscribe", "signOut"]);
    expect(push).toHaveBeenCalledWith("/");
  });

  it("cierra la sesión igual si dar de baja la suscripción falla", async () => {
    unsubscribeFromPush.mockRejectedValue(new Error("sin push"));
    const { result } = renderHook(() => useSignOut(), { wrapper });
    await act(async () => {
      await result.current.signOut();
    });
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/");
  });
});
