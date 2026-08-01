// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TodayEventsBlock } from "./today-events-block";

const TZ = "America/Argentina/Buenos_Aires";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function mockEventsFetch(status: number, body: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(status, body)));
}

function renderBlock() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TodayEventsBlock todayDate="2026-08-05" timezone={TZ} />
    </QueryClientProvider>,
  );
}

describe("TodayEventsBlock (bloque 7.8, spec vistas-lista)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin eventos hoy, no muestra nada", async () => {
    mockEventsFetch(200, { status: "ok", events: [] });
    renderBlock();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("Eventos de hoy")).not.toBeInTheDocument();
  });

  it("sin conexión con Google, no muestra nada (no es un error)", async () => {
    mockEventsFetch(200, { status: "not_connected" });
    renderBlock();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("Eventos de hoy")).not.toBeInTheDocument();
  });

  it("con eventos hoy, los muestra con el color del calendario y la hora", async () => {
    mockEventsFetch(200, {
      status: "ok",
      events: [
        {
          id: "1",
          calendarId: "primary",
          calendarColor: "#a4bdfc",
          title: "Reunión de equipo",
          description: null,
          location: null,
          allDay: false,
          start: "2026-08-05T13:00:00.000Z",
          end: "2026-08-05T14:00:00.000Z",
          timeZone: TZ,
          isRecurring: false,
          recurringEventId: null,
          originalStartTime: null,
        },
      ],
    });
    renderBlock();

    expect(await screen.findByText("Eventos de hoy")).toBeInTheDocument();
    expect(screen.getByText("Reunión de equipo")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
  });

  it("con la conexión rota, avisa que los eventos no cargaron", async () => {
    mockEventsFetch(200, { status: "unavailable", reason: "needs_reauth" });
    renderBlock();

    expect(await screen.findByText("Eventos de hoy")).toBeInTheDocument();
    expect(screen.getByText(/necesita reconectarse/i)).toBeInTheDocument();
  });

  it("con Google caído, avisa sin romper la vista (tarea 3.7)", async () => {
    mockEventsFetch(200, { status: "unavailable", reason: "transient" });
    renderBlock();

    expect(await screen.findByText("Eventos de hoy")).toBeInTheDocument();
    expect(screen.getByText(/no respondió/i)).toBeInTheDocument();
  });
});
