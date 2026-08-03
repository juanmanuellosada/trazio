// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import type { CalendarEventInstance } from "@/lib/calendar/events";
import type { EventRecurrenceValue } from "@/lib/calendar/event-recurrence";
import { EditEventDialog } from "./edit-event-dialog";

const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

// D24/tarea 7.11-8.4: segundo camino para editar el horario de un evento
// existente sin arrastrar, con el mismo requirement de "sin default
// silencioso" que ya cubre `recurrence-scope-dialog.test.tsx` para el
// diálogo en sí — acá se verifica que el formulario no mute nada hasta que
// se elige un alcance, cuando el evento pertenece a una serie.

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("@/lib/calendar/use-google-calendars", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/calendar/use-google-calendars")>();
  return { ...actual, useGoogleCalendars: () => ({ data: { calendars: [] }, isLoading: false, isError: false }) };
});

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

function renderDialog(event: CalendarEventInstance, initialRecurrence: EventRecurrenceValue = null) {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (_url, init) => {
    // `useEventRecurrenceRule` (tarea 3.1/3.4) pide la repetición vigente
    // del maestro con un GET sin body, antes de mostrar el formulario.
    if (!init?.method) return jsonResponse(200, { recurrence: initialRecurrence });
    return jsonResponse(200, event);
  });
  vi.stubGlobal("fetch", fetchMock);
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={PREFERENCES}>
        <EditEventDialog open onOpenChange={vi.fn()} event={event} timezone="America/Argentina/Buenos_Aires" />
      </PreferencesProvider>
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

    // El formulario recién se monta después de leer la repetición vigente
    // de la serie (`useEventRecurrenceRule`): `findByRole` en vez de
    // `getByRole` porque ese GET es asíncrono.
    await user.click(await screen.findByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("radiogroup")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);

    await user.click(screen.getByRole("radio", { name: /esta ocurrencia/i }));
    await user.click(screen.getByRole("button", { name: "Editar" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(true));
    const [, init] = fetchMock.mock.calls.find(([, callInit]) => callInit?.method === "PATCH")!;
    expect(JSON.parse(init!.body as string).scope).toBe("this");
  });

  // Tarea 3.4, riesgo principal del cambio: cambiar la regla de repetición
  // con alcance de una sola ocurrencia no significa nada, así que ese
  // alcance no puede ofrecerse cuando lo que cambió es la propia regla.
  it("cambiar la repetición de una serie no ofrece 'esta ocurrencia' como alcance", async () => {
    const user = userEvent.setup();
    const fetchMock = renderDialog(RECURRING_EVENT, { rule: "FREQ=WEEKLY;BYDAY=WE", endsAt: null, count: null });

    await user.click(await screen.findByRole("combobox", { name: "Repetición" }));
    await user.click(await screen.findByRole("option", { name: "No se repite" }));

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByRole("radio", { name: /esta ocurrencia/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /^Todas/ }));
    await user.click(screen.getByRole("button", { name: "Editar" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([, callInit]) => callInit?.method === "PATCH")).toBe(true));
    const [, init] = fetchMock.mock.calls.find(([, callInit]) => callInit?.method === "PATCH")!;
    const body = JSON.parse(init!.body as string);
    expect(body.scope).toBe("all");
    expect(body.changes.recurrence).toBeNull();
  });

  it("editar un evento de una serie sin tocar la repetición sigue ofreciendo 'esta ocurrencia'", async () => {
    const user = userEvent.setup();
    const fetchMock = renderDialog(RECURRING_EVENT, { rule: "FREQ=WEEKLY;BYDAY=WE", endsAt: null, count: null });

    await user.click(await screen.findByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /esta ocurrencia/i })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /esta ocurrencia/i }));
    await user.click(screen.getByRole("button", { name: "Editar" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([, callInit]) => callInit?.method === "PATCH")).toBe(true));
    const [, init] = fetchMock.mock.calls.find(([, callInit]) => callInit?.method === "PATCH")!;
    const body = JSON.parse(init!.body as string);
    expect(body.scope).toBe("this");
    // Sin tocar la repetición, `recurrence` no viaja: deja la que ya tenía la serie intacta.
    expect(body.changes.recurrence).toBeUndefined();
  });
});
