// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Habit } from "@/lib/habits/habit-columns";
import type { HoyEventsResult } from "./use-hoy-events";
import { useDayLoad } from "./use-day-load";

let habitsResult: { data: Habit[] | undefined } = { data: [] };
let skipsResult: { data: Record<string, boolean> | undefined } = { data: {} };

vi.mock("@/lib/habits/use-habits", () => ({ useHabits: () => habitsResult }));
vi.mock("@/lib/habits/skips", () => ({ useHabitSkipsForDate: () => skipsResult }));

const TIMEZONE = "America/Argentina/Buenos_Aires";
const TODAY = "2026-08-05";
const NOW = new Date("2026-08-05T15:00:00.000Z");
const NOT_CONNECTED: HoyEventsResult = { status: "not_connected" };

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: "habit-1",
    name: "Meditar",
    icon: "sun",
    color: "#000000",
    duration_minutes: 20,
    scheduled_time: null,
    frequency_type: "daily",
    times_per_week: null,
    days_of_week: null,
    is_archived: false,
    created_at: "2026-01-01T00:00:00.000Z",
    completed_today: false,
    ...overrides,
  };
}

function eventsOk(events: Extract<HoyEventsResult, { status: "ok" }>["events"]): HoyEventsResult {
  return { status: "ok", events, calendarName: () => "Calendario", canEdit: () => false };
}

describe("useDayLoad (carga-del-dia): junta tareas, hábitos y eventos", () => {
  it("suma tareas, hábitos pendientes y eventos con horario", () => {
    habitsResult = { data: [habit({ duration_minutes: 20 })] };
    skipsResult = { data: {} };
    const eventsState = eventsOk([
      {
        id: "e1",
        calendarId: "cal-1",
        calendarColor: null,
        title: "Reunión",
        description: null,
        location: null,
        allDay: false,
        start: "2026-08-05T13:00:00.000Z",
        end: "2026-08-05T14:00:00.000Z",
        timeZone: TIMEZONE,
        isRecurring: false,
        recurringEventId: null,
        originalStartTime: null,
        htmlLink: null,
      },
    ]);

    const { result } = renderHook(() =>
      useDayLoad({
        todayDate: TODAY,
        timezone: TIMEZONE,
        now: NOW,
        tasks: [{ duration_minutes: 90 }, { duration_minutes: 30 }],
        initialHabits: [],
        eventsState,
      }),
    );

    // 90 + 30 (tareas) + 20 (hábito) + 60 (evento de una hora) = 200
    expect(result.current).toEqual({ totalMinutes: 200, withoutDuration: 0 });
  });

  it("un hábito completado hoy no suma (D-B)", () => {
    habitsResult = { data: [habit({ completed_today: true })] };
    skipsResult = { data: {} };

    const { result } = renderHook(() =>
      useDayLoad({ todayDate: TODAY, timezone: TIMEZONE, now: NOW, tasks: [], initialHabits: [], eventsState: NOT_CONNECTED }),
    );

    expect(result.current).toEqual({ totalMinutes: 0, withoutDuration: 0 });
  });

  it("un hábito salteado no suma (D-B), aunque isHabitPendingToday por sí solo no lo excluya", () => {
    habitsResult = { data: [habit({ id: "h-skip", completed_today: false })] };
    skipsResult = { data: { "h-skip": true } };

    const { result } = renderHook(() =>
      useDayLoad({ todayDate: TODAY, timezone: TIMEZONE, now: NOW, tasks: [], initialHabits: [], eventsState: NOT_CONNECTED }),
    );

    expect(result.current).toEqual({ totalMinutes: 0, withoutDuration: 0 });
  });

  it("un evento de todo el día no suma (D-B)", () => {
    habitsResult = { data: [] };
    skipsResult = { data: {} };
    const eventsState = eventsOk([
      {
        id: "e-allday",
        calendarId: "cal-1",
        calendarColor: null,
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
        htmlLink: null,
      },
    ]);

    const { result } = renderHook(() =>
      useDayLoad({ todayDate: TODAY, timezone: TIMEZONE, now: NOW, tasks: [], initialHabits: [], eventsState }),
    );

    expect(result.current).toEqual({ totalMinutes: 0, withoutDuration: 0 });
  });

  it("sin calendario conectado, el total sale igual con tareas y hábitos (D-D)", () => {
    habitsResult = { data: [habit({ duration_minutes: 15 })] };
    skipsResult = { data: {} };

    const { result } = renderHook(() =>
      useDayLoad({
        todayDate: TODAY,
        timezone: TIMEZONE,
        now: NOW,
        tasks: [{ duration_minutes: 45 }],
        initialHabits: [],
        eventsState: NOT_CONNECTED,
      }),
    );

    expect(result.current).toEqual({ totalMinutes: 60, withoutDuration: 0 });
  });

  it("con Google caído (unavailable), el total sale igual con tareas y hábitos (D-D)", () => {
    habitsResult = { data: [] };
    skipsResult = { data: {} };

    const { result } = renderHook(() =>
      useDayLoad({
        todayDate: TODAY,
        timezone: TIMEZONE,
        now: NOW,
        tasks: [{ duration_minutes: 30 }],
        initialHabits: [],
        eventsState: { status: "unavailable", reason: "transient" },
      }),
    );

    expect(result.current).toEqual({ totalMinutes: 30, withoutDuration: 0 });
  });

  it("una tarea sin duración se cuenta aparte, no suma", () => {
    habitsResult = { data: [] };
    skipsResult = { data: {} };

    const { result } = renderHook(() =>
      useDayLoad({
        todayDate: TODAY,
        timezone: TIMEZONE,
        now: NOW,
        tasks: [{ duration_minutes: 30 }, { duration_minutes: null }],
        initialHabits: [],
        eventsState: NOT_CONNECTED,
      }),
    );

    expect(result.current).toEqual({ totalMinutes: 30, withoutDuration: 1 });
  });
});
