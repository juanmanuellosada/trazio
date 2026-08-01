// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { CalendarEventInstance } from "@/lib/calendar/events";
import { EditEventDialog } from "./edit-event-dialog";

// D24/tarea 7.11-8.4: segundo camino para editar el horario de un evento
// existente sin arrastrar, con el mismo requirement de "sin default
// silencioso" que ya cubre `recurrence-scope-dialog.test.tsx` para el
// diálogo en sí — acá se verifica que el formulario no mute nada hasta que
// se elige un alcance, cuando el evento pertenece a una serie.

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@/lib/calendar/use-google-calendars", () => ({
  useGoogleCalendars: () => ({ data: { calendars: [] }, isLoading: false, isError: false }),
}));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const SIMPLE_EVENT: CalendarEventInstance = {
  id: "event-1",
  calendarId: "primary",
  calendarColor: "#039BE5",
  title: "Reunión",
  description: null,
  location: null,
  allDay: false,
  start: "2026-08-05T13:00:00.000Z",
  end: "2026-08-05T14:00:00.000Z",
  timeZone: "America/Argentina/Buenos_Aires",
  isRecurring: false,
  recurringEventId: null,
  originalStartTime: null,
};

const RECURRING_EVENT: CalendarEventInstance = {
  ...SIMPLE_EVENT,
  id: "event-2",
  isRecurring: true,
  recurringEventId: "series-1",
  originalStartTime: "2026-08-05T13:00:00.000Z",
};

function renderDialog(event: CalendarEventInstance) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => jsonResponse(200, event));
  vi.stubGlobal("fetch", fetchMock);
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <EditEventDialog open onOpenChange={vi.fn()} event={event} timezone="America/Argentina/Buenos_Aires" />
    </QueryClientProvider>,
  );
  return fetchMock;
}

describe("EditEventDialog (D24, camino sin arrastre)", () => {
  it("precarga el título del evento existente", () => {
    renderDialog(SIMPLE_EVENT);
    expect(screen.getByLabelText("Título")).toHaveValue("Reunión");
  });

  it("un evento puntual guarda directo, sin preguntar alcance", async () => {
    const user = userEvent.setup();
    const fetchMock = renderDialog(SIMPLE_EVENT);

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/calendar/events/event-1");
    expect(JSON.parse(init!.body as string).scope).toBeUndefined();
  });

  it("un evento de una serie recurrente abre RecurrenceScopeDialog antes de mutar, y no llama a la API hasta elegir un alcance", async () => {
    const user = userEvent.setup();
    const fetchMock = renderDialog(RECURRING_EVENT);

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("radiogroup")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("radio", { name: /esta ocurrencia/i }));
    await user.click(screen.getByRole("button", { name: "Editar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init!.body as string).scope).toBe("this");
  });
});
