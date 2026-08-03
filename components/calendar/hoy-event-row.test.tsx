// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { CalendarEventInstance } from "@/lib/calendar/events";
import { HoyEventRow } from "./hoy-event-row";

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
  defaultProjectId: null,
};

const deleteMutate = vi.fn();
vi.mock("@/lib/calendar/use-delete-event", () => ({
  useDeleteEvent: () => ({ mutate: deleteMutate }),
}));

// El diálogo de edición real pide `useGoogleCalendars`/`useUpdateEvent`
// (TanStack Query) y `useEventRecurrenceRule`, ajenos al propósito de este
// test: se reemplaza por un stub que solo expone si está abierto y con qué
// `readOnly`, igual criterio que otros tests de esta suite mockean sus
// hooks de datos.
vi.mock("./edit-event-dialog", () => ({
  EditEventDialog: ({ readOnly }: { readOnly?: boolean }) => (
    <div data-testid="edit-event-dialog">{readOnly ? "solo lectura" : "editable"}</div>
  ),
}));

function event(overrides: Partial<CalendarEventInstance> = {}): CalendarEventInstance {
  return {
    id: "event-1",
    calendarId: "cal-1",
    calendarColor: "#039BE5",
    title: "Reunión con el equipo",
    description: null,
    location: null,
    allDay: false,
    start: "2026-08-05T11:00:00.000Z",
    end: "2026-08-05T12:00:00.000Z",
    timeZone: "America/Argentina/Buenos_Aires",
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    htmlLink: "https://calendar.google.com/event?eid=abc",
    ...overrides,
  };
}

// Cae dentro del 05/08 en BA (2026-08-05T15:00:00Z == 12:00 BA), mismo día que `event()`.
const NOW = new Date("2026-08-05T15:00:00.000Z");

function renderRow(props: Partial<Parameters<typeof HoyEventRow>[0]> = {}) {
  render(
    <PreferencesProvider preferences={TEST_PREFERENCES}>
      <ul>
        <HoyEventRow
          event={event()}
          calendarName="Trabajo"
          canEdit
          timezone="America/Argentina/Buenos_Aires"
          now={NOW}
          {...props}
        />
      </ul>
    </PreferencesProvider>,
  );
}

describe("HoyEventRow (hoy-con-eventos, D-D)", () => {
  it("doble clic abre el diálogo de edición, editable cuando canEdit", () => {
    renderRow();
    const user = userEvent.setup();
    return user.dblClick(screen.getByRole("button", { name: "Reunión con el equipo" })).then(() => {
      expect(screen.getByTestId("edit-event-dialog")).toHaveTextContent("editable");
    });
  });

  it("de solo lectura: el diálogo se abre igual, sin permitir editar", async () => {
    renderRow({ canEdit: false });
    const user = userEvent.setup();
    await user.dblClick(screen.getByRole("button", { name: "Reunión con el equipo" }));
    expect(screen.getByTestId("edit-event-dialog")).toHaveTextContent("solo lectura");
  });

  it("eliminar un evento simple pide confirmación antes de mutar", async () => {
    const user = userEvent.setup();
    renderRow();
    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    expect(deleteMutate).not.toHaveBeenCalled();
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(deleteMutate).toHaveBeenCalledWith({
      target: { calendarId: "cal-1", eventId: "event-1", recurringEventId: null, originalStartTime: null },
      scope: undefined,
    });
  });

  it("eliminar una ocurrencia de una serie pregunta el alcance en vez de confirmar directo", async () => {
    const user = userEvent.setup();
    renderRow({ event: event({ recurringEventId: "series-1", originalStartTime: "2026-08-05T11:00:00.000Z" }) });
    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    await user.click(await screen.findByRole("menuitem", { name: "Eliminar" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(await screen.findByText("Eliminar evento recurrente")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /todas/i }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(deleteMutate).toHaveBeenCalledWith({
      target: { calendarId: "cal-1", eventId: "event-1", recurringEventId: "series-1", originalStartTime: "2026-08-05T11:00:00.000Z" },
      scope: "all",
    });
  });

  it("abrir en Google Calendar usa el htmlLink del evento", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderRow();
    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    await user.click(await screen.findByRole("menuitem", { name: "Abrir en Google Calendar" }));
    expect(openSpy).toHaveBeenCalledWith("https://calendar.google.com/event?eid=abc", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });
});
