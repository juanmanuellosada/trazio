// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { defaultOptionsForViewKey } from "@/lib/view-options/schema";
import type { CalendarEventInstance } from "@/lib/calendar/events";
import { ScreenCalendar } from "./screen-calendar";

const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

/**
 * Defecto encontrado al verificar el grupo 7 de
 * `calendario-legible-y-manipulable`: Google solo garantiza que `event.id`
 * sea único DENTRO de un calendario, no entre los calendarios habilitados de
 * la misma cuenta (el simulador de e2e lo modela igual, cada calendario
 * numera sus propios `evt-N` desde 1). `eventsById` en `screen-calendar.tsx`
 * indexaba solo por `event.id`: con dos eventos de calendarios distintos que
 * compartían id, abrir el diálogo de edición de uno terminaba mostrando el
 * otro — reproducido dos veces a mano contra el simulador real (clic derecho
 * en "Reunión Personal" abría la confirmación de borrado de "Standup
 * Trabajo"). Este test reproduce la misma colisión de id a nivel de
 * componente: dos eventos con el mismo `id` crudo, cada uno en su propio
 * calendario.
 */

vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/lib/habits/use-habits", () => ({ useHabits: () => ({ data: [] }) }));
vi.mock("@/lib/habits/use-habit-schedule-overrides-range", () => ({ useHabitScheduleOverridesForRange: () => ({ data: {} }) }));
vi.mock("@/lib/habits/skips", () => ({ useSkipHabit: () => ({ mutate: vi.fn() }), useHabitSkipsForRange: () => ({ data: {} }) }));
vi.mock("@/lib/habits/completions", () => ({ useHabitCompletionsForRange: () => ({ data: {} }) }));
vi.mock("@/lib/habits/mutations", () => ({
  useMarkHabitDone: () => ({ mutate: vi.fn() }),
  useUnmarkHabitDone: () => ({ mutate: vi.fn() }),
  useUpdateHabit: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/lib/habits/schedule-overrides", () => ({ useSetHabitScheduleOverride: () => ({ mutate: vi.fn() }) }));
vi.mock("@/lib/tasks/mutations", () => ({ useUpdateTask: () => ({ mutate: vi.fn() }), useDeleteTask: () => ({ mutate: vi.fn() }) }));
vi.mock("@/lib/projects/use-projects", () => ({ useProjects: () => ({ data: [] }) }));
vi.mock("@/components/tasks/task-detail-context", () => ({ useTaskDetail: () => ({ open: vi.fn(), close: vi.fn() }) }));
vi.mock("@/lib/calendar/use-update-event", () => ({ useUpdateEvent: () => ({ mutate: vi.fn() }) }));

vi.mock("@/lib/calendar/use-google-calendars", () => ({
  useGoogleCalendars: () => ({
    data: {
      calendars: [
        { id: "calendar-a", summary: "Personal", backgroundColor: "#4285f4", primary: true, accessRole: "owner" },
        { id: "calendar-b", summary: "Trabajo", backgroundColor: "#33b679", primary: false, accessRole: "owner" },
      ],
      enabledCalendarIds: ["calendar-a", "calendar-b"],
      connected: true,
    },
  }),
  canWriteCalendar: (calendar: { accessRole: string }) => calendar.accessRole === "owner" || calendar.accessRole === "writer",
  CalendarAdminError: class extends Error {},
}));

function collidingEvent(overrides: Partial<CalendarEventInstance>): CalendarEventInstance {
  return {
    id: "evt-1",
    calendarId: "calendar-a",
    calendarColor: null,
    title: "Evento",
    description: null,
    location: null,
    allDay: false,
    start: "2026-08-05T13:00:00-03:00",
    end: "2026-08-05T14:00:00-03:00",
    timeZone: "America/Argentina/Buenos_Aires",
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    htmlLink: null,
    ...overrides,
  };
}

const eventoPersonal = collidingEvent({ calendarId: "calendar-a", title: "Reunión Personal" });
const eventoTrabajo = collidingEvent({ calendarId: "calendar-b", title: "Standup Trabajo", start: "2026-08-05T15:00:00-03:00", end: "2026-08-05T16:00:00-03:00" });

vi.mock("@/lib/calendar/use-calendar-range-events", () => ({
  useCalendarRangeEvents: () => ({ data: { status: "ok", events: [eventoPersonal, eventoTrabajo] } }),
}));

const NOW = new Date("2026-08-03T12:00:00-03:00");

function renderScreenCalendar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const options = {
    ...defaultOptionsForViewKey("bandeja"),
    viewShape: "calendario" as const,
    formato_calendario: "semana" as const,
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={PREFERENCES}>
        <ScreenCalendar
          timezone="America/Argentina/Buenos_Aires"
          weekStartsOn={1}
          timeFormat={24}
          options={options}
          tasks={[]}
          resolveTaskColor={() => "#0284C7"}
          createTaskProjectId={null}
        />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe("ScreenCalendar — dos eventos de calendarios distintos con el mismo id crudo de Google", () => {
  beforeEach(() => {
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("abrir el diálogo de edición del evento de un calendario no muestra el del otro", async () => {
    const user = userEvent.setup();
    renderScreenCalendar();

    await user.click(await screen.findByRole("button", { name: "Reunión Personal" }));

    expect(await screen.findByLabelText("Título")).toHaveValue("Reunión Personal");
    expect(screen.queryByDisplayValue("Standup Trabajo")).not.toBeInTheDocument();
  });

  it("abrir el diálogo de edición del otro evento tampoco se confunde en sentido inverso", async () => {
    const user = userEvent.setup();
    renderScreenCalendar();

    await user.click(await screen.findByRole("button", { name: "Standup Trabajo" }));

    expect(await screen.findByLabelText("Título")).toHaveValue("Standup Trabajo");
    expect(screen.queryByDisplayValue("Reunión Personal")).not.toBeInTheDocument();
  });
});
