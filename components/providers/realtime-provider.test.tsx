// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RealtimeProvider } from "./realtime-provider";
import { OfflineBanner } from "./offline-banner";
import { OfflineBoundary } from "./offline-boundary";

vi.mock("@/lib/realtime/subscribe", () => ({ subscribeToRealtime: vi.fn(() => () => {}) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn(() => ({})) }));

function setNavigatorOnLine(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function renderApp() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider userId="user-1">
        <OfflineBanner />
        <OfflineBoundary>
          <button>Guardar</button>
        </OfflineBoundary>
      </RealtimeProvider>
    </QueryClientProvider>,
  );
}

/** El límite `inert` envuelve el contenido en un `<div>` propio (`offline-boundary.tsx`). */
function boundaryDiv() {
  return screen.getByRole("button", { name: "Guardar" }).closest("div") as HTMLElement;
}

describe("RealtimeProvider + OfflineBanner + OfflineBoundary (10.5/10.6)", () => {
  afterEach(() => setNavigatorOnLine(true));

  it("online: sin cartel, contenido interactivo", () => {
    setNavigatorOnLine(true);
    renderApp();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(boundaryDiv()).not.toHaveAttribute("inert");
  });

  it("navigator.onLine en falso: cartel persistente visible y contenido inerte (D4 señal 1, sin mirar las otras dos)", () => {
    setNavigatorOnLine(false);
    renderApp();

    expect(screen.getByRole("alert")).toHaveTextContent(/sin conexión/i);
    expect(boundaryDiv()).toHaveAttribute("inert");
  });
});
