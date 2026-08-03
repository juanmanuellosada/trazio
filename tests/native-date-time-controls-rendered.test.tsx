// @vitest-environment jsdom
import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { ReminderPicker } from "@/components/reminders/reminder-picker";
import { RecurrenceEditor } from "@/components/tasks/recurrence-editor";
import { EditEventDialog } from "@/components/calendar/edit-event-dialog";
import { HabitFormDialog } from "@/components/habits/habit-form-dialog";
import { HabitCard } from "@/components/habits/habit-card";
import { NotificationsSection } from "@/components/settings/notifications-section";
import type { CalendarEventInstance } from "@/lib/calendar/events";
import type { Habit } from "@/lib/habits/habit-columns";

/**
 * Auditoría en lo renderizado (`sin-controles-nativos`, tareas 4.2 y el
 * "cuarto caso" ampliado tras el archivo del cambio): a diferencia de
 * `tests/native-controls-audit.test.ts` (que recorre el código fuente
 * buscando `<input type="...">` en crudo), este test monta de verdad los
 * selectores que este cambio corrigió y revisa el DOM resultante — así
 * detecta también un `<input type="date">` nativo que llegara envuelto en
 * el componente `Input` de la app (`@/components/ui/input`), que la
 * auditoría de código fuente no veía porque buscaba la etiqueta en
 * minúscula. Es justo la clase de deuda que se coló la vez pasada — dos
 * veces, ya que el horario de referencia de `NotificationsSection` se
 * agregó nativo el mismo día que se escribió la regla que lo prohíbe.
 */

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/calendar/use-google-calendars", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/calendar/use-google-calendars")>();
  return { ...actual, useGoogleCalendars: () => ({ data: { calendars: [] }, isLoading: false, isError: false }) };
});
// Mismo recorte que `habit-form-dialog.test.tsx`: el dataset real de
// emojibase-data no hace falta para este test, solo que `EmojiPicker`
// monte sin reventar.
vi.mock("emojibase-data/es/compact.json", () => ({ default: [] }));
vi.mock("emojibase-data/es/messages.json", () => ({ default: { groups: [] } }));
vi.mock("emojibase-data/meta/groups.json", () => ({ default: { groups: {} } }));
vi.mock("@/lib/habits/schedule-overrides", () => ({
  useHabitScheduleOverride: () => ({ data: null, isLoading: false }),
  useSetHabitScheduleOverride: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveHabitScheduleOverride: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/habits/mutations", () => ({
  useMarkHabitDone: () => ({ mutate: vi.fn(), isPending: false }),
  useUnmarkHabitDone: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateHabit: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateHabit: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));
// Mismo mock que `task-detail-content.test.tsx`: evita que `useAddReminder`
// (llamado por `ReminderPicker` con o sin `taskId`), `usePushSubscriptions`
// y las mutaciones de hábitos necesiten las variables de entorno reales de
// Supabase solo para montar el componente.
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={PREFERENCES}>{ui}</PreferencesProvider>
    </QueryClientProvider>,
  );
}

function expectNoNativeDateTimeControls() {
  const offenders = document.body.querySelectorAll(
    'input[type="date"], input[type="time"], input[type="datetime-local"], select',
  );
  expect(Array.from(offenders).map((el) => el.outerHTML)).toEqual([]);
}

describe("sin controles nativos: lo que se renderiza (tarea 4.2)", () => {
  it("el recordatorio con fecha y hora fija no usa un <input type=\"datetime-local\">", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReminderPicker dueAt={null} dueDate={null} drafts={[]} onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Recordatorios" }));
    await user.click(screen.getByRole("radio", { name: /Fecha y hora fija/ }));

    expectNoNativeDateTimeControls();
  });

  it("el fin de la recurrencia no usa un <input type=\"date\">", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RecurrenceEditor
        value={{ rule: "FREQ=WEEKLY;BYDAY=SU", endsAt: "2026-12-31", count: null, anchor: null }}
        onChange={vi.fn()}
        dueDate="2026-04-05"
      />,
    );

    await user.click(screen.getByLabelText("Fecha de fin de la repetición"));

    expectNoNativeDateTimeControls();
  });

  it("los horarios de un evento no usan un <input type=\"date\"> ni \"datetime-local\">", () => {
    const event: CalendarEventInstance = {
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
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(event), { status: 200, headers: { "Content-Type": "application/json" } })),
    );

    renderWithProviders(<EditEventDialog open onOpenChange={vi.fn()} event={event} timezone="America/Argentina/Buenos_Aires" />);

    expectNoNativeDateTimeControls();
  });

  it("el evento de todo el día tampoco usa un <input type=\"date\">", () => {
    const event: CalendarEventInstance = {
      id: "event-2",
      calendarId: "primary",
      calendarColor: "#039BE5",
      title: "Feriado",
      description: null,
      location: null,
      allDay: true,
      start: "2026-08-05",
      end: "2026-08-06",
      timeZone: null,
      isRecurring: false,
      recurringEventId: null,
      originalStartTime: null,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(event), { status: 200, headers: { "Content-Type": "application/json" } })),
    );

    renderWithProviders(<EditEventDialog open onOpenChange={vi.fn()} event={event} timezone="America/Argentina/Buenos_Aires" />);

    expectNoNativeDateTimeControls();
  });

  it("el horario opcional de un hábito no usa un <input type=\"time\">", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HabitFormDialog open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Agregar horario" }));

    expectNoNativeDateTimeControls();
  });

  it("reprogramar el horario de un hábito no usa <input type=\"date\"> ni \"time\">", async () => {
    const user = userEvent.setup();
    const habit: Habit = {
      id: "habit-1",
      name: "Meditar",
      icon: "🧘",
      color: "celeste",
      duration_minutes: 15,
      scheduled_time: "07:00",
      frequency_type: "daily",
      times_per_week: null,
      days_of_week: null,
      is_archived: false,
      created_at: "2026-01-01T00:00:00.000Z",
      completed_today: false,
    };
    renderWithProviders(
      <HabitCard
        habit={habit}
        streak={{ currentStreak: 3, bestStreak: 5 }}
        completedDates={[]}
        dueToday
        timezone="America/Argentina/Buenos_Aires"
        now={new Date("2026-07-31T15:00:00.000Z")}
        todayDate="2026-07-31"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reprogramar el horario de Meditar" }));

    expectNoNativeDateTimeControls();
  });

  it("la hora de referencia de los recordatorios no usa un <input type=\"time\">", () => {
    renderWithProviders(<NotificationsSection userId="user-1" referenceTime="09:00:00" />);

    expectNoNativeDateTimeControls();
  });
});
