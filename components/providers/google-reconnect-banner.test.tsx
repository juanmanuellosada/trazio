// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsProvider, useSettings } from "@/components/settings/settings-context";
import { GoogleReconnectBanner } from "./google-reconnect-banner";

/**
 * Tests del banner global de reconexión (bloque 7.7, D-I): aparece solo
 * cuando la conexión está en `needs_reauth`, no para "sin conexión" ni para
 * fallas transitorias de Google, y su acción abre Configuración directo en
 * la sección Calendarios.
 */

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function mockCalendarsFetch(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(status, body)));
}

function SectionProbe() {
  const { initialSection } = useSettings();
  return <p>sección: {initialSection ?? "ninguna"}</p>;
}

function renderBanner() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <GoogleReconnectBanner />
        <SectionProbe />
      </SettingsProvider>
    </QueryClientProvider>,
  );
}

describe("GoogleReconnectBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no aparece sin conexión con Google", async () => {
    mockCalendarsFetch(200, { calendars: [], enabledCalendarIds: [], connected: false });
    renderBanner();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no aparece con la conexión activa", async () => {
    mockCalendarsFetch(200, { calendars: [], enabledCalendarIds: [], connected: true });
    renderBanner();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("aparece con needs_reauth, y reconectar abre Configuración en Calendarios", async () => {
    mockCalendarsFetch(409, { error: "needs_reauth" });
    const user = userEvent.setup();
    renderBanner();

    expect(await screen.findByRole("alert")).toHaveTextContent(/necesita reconectarse/i);

    await user.click(screen.getByRole("button", { name: "Reconectar" }));
    expect(await screen.findByText("sección: calendarios")).toBeInTheDocument();
  });
});
