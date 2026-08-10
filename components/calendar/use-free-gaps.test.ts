// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Habit } from "@/lib/habits/habit-columns";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { HoyEventsResult } from "./use-hoy-events";
import { useFreeGaps } from "./use-free-gaps";

let habitsResult: { data: Habit[] | undefined } = { data: [] };
let skipsResult: { data: Record<string, boolean> | undefined } = { data: {} };

vi.mock("@/lib/habits/use-habits", () => ({ useHabits: () => habitsResult }));
vi.mock("@/lib/habits/skips", () => ({ useHabitSkipsForDate: () => skipsResult }));

const TIMEZONE = "America/Argentina/Buenos_Aires";
const TODAY = "2026-08-05";
// 15:00 UTC == 12:00 en America/Argentina/Buenos_Aires (UTC-3).
const NOW = new Date("2026-08-05T15:00:00.000Z");
const DAY_END_TIME = "22:00:00";
const NOT_CONNECTED: HoyEventsResult = { status: "not_connected" };

function task(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: "task-1",
    project_id: "proj-1",
    section_id: null,
    parent_id: null,
    title: "Tarea",
    priority: 4,
    due_date: TODAY,
    due_at: null,
    duration_minutes: 30,
    deadline: null,
    completed_at: null,
    position: 0,
    labels: [],
    ...overrides,
  };
}

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

function run(overrides: Partial<Parameters<typeof useFreeGaps>[0]> = {}) {
  return renderHook(() =>
    useFreeGaps({
      todayDate: TODAY,
      timezone: TIMEZONE,
      now: NOW,
      dayEndTime: DAY_END_TIME,
      tasks: [],
      initialHabits: [],
      eventsState: NOT_CONNECTED,
      ...overrides,
    }),
  ).result;
}

describe("useFreeGaps", () => {
  it("sin nada ocupado: un hueco hasta la hora de fin del día", () => {
    habitsResult = { data: [] };
    const { current } = run();
    expect(current.dayEnded).toBe(false);
    expect(current.gaps).toEqual([{ start: NOW, end: new Date("2026-08-05T22:00:00.000-03:00") }]);
    expect(current.unassignedItems).toEqual([]);
    expect(current.unassignedTasks).toEqual([]);
  });

  it("una tarea con hora y duración ocupa un bloque, resta tiempo libre", () => {
    habitsResult = { data: [] };
    const timed = task({ id: "t-timed", due_date: null, due_at: "2026-08-05T18:00:00.000Z", duration_minutes: 60 });
    const { current } = run({ tasks: [timed] });

    expect(current.gaps).toEqual([
      { start: NOW, end: new Date("2026-08-05T18:00:00.000Z") },
      { start: new Date("2026-08-05T19:00:00.000Z"), end: new Date("2026-08-05T22:00:00.000-03:00") },
    ]);
    expect(current.unassignedTasks).toEqual([]);
  });

  it("una tarea sin hora suma al pedido sin lugar, no resta tiempo libre", () => {
    habitsResult = { data: [] };
    const untimed = task({ id: "t-untimed", duration_minutes: 45 });
    const { current } = run({ tasks: [untimed] });

    expect(current.gaps).toEqual([{ start: NOW, end: new Date("2026-08-05T22:00:00.000-03:00") }]);
    expect(current.unassignedItems).toEqual([{ durationMinutes: 45 }]);
    expect(current.unassignedTasks).toEqual([untimed]);
  });

  it("una tarea con hora pero sin duración: no resta tiempo libre, cuenta como sin duración", () => {
    habitsResult = { data: [] };
    const timedNoDuration = task({ id: "t-nodur", due_date: null, due_at: "2026-08-05T18:00:00.000Z", duration_minutes: null });
    const { current } = run({ tasks: [timedNoDuration] });

    expect(current.gaps).toEqual([{ start: NOW, end: new Date("2026-08-05T22:00:00.000-03:00") }]);
    expect(current.unassignedItems).toEqual([{ durationMinutes: null }]);
    expect(current.unassignedTasks).toEqual([]);
  });

  it("un hábito con hora ocupa un bloque; uno sin hora suma al pedido sin lugar", () => {
    habitsResult = {
      data: [
        habit({ id: "h-timed", scheduled_time: "13:00:00", duration_minutes: 30 }),
        habit({ id: "h-untimed", scheduled_time: null, duration_minutes: 20 }),
      ],
    };
    const { current } = run();

    // 13:00 local == 16:00 UTC.
    expect(current.gaps).toEqual([
      { start: NOW, end: new Date("2026-08-05T16:00:00.000Z") },
      { start: new Date("2026-08-05T16:30:00.000Z"), end: new Date("2026-08-05T22:00:00.000-03:00") },
    ]);
    expect(current.unassignedItems).toEqual([{ durationMinutes: 20 }]);
  });

  it("un evento con horario ocupa un bloque", () => {
    habitsResult = { data: [] };
    const eventsState = eventsOk([
      {
        id: "e1",
        calendarId: "cal-1",
        calendarColor: null,
        title: "Reunión",
        description: null,
        location: null,
        allDay: false,
        start: "2026-08-05T18:00:00.000Z",
        end: "2026-08-05T19:00:00.000Z",
        timeZone: TIMEZONE,
        isRecurring: false,
        recurringEventId: null,
        originalStartTime: null,
        htmlLink: null,
      },
    ]);
    const { current } = run({ eventsState });

    expect(current.gaps).toEqual([
      { start: NOW, end: new Date("2026-08-05T18:00:00.000Z") },
      { start: new Date("2026-08-05T19:00:00.000Z"), end: new Date("2026-08-05T22:00:00.000-03:00") },
    ]);
  });

  it("un evento de todo el día no ocupa ningún bloque", () => {
    habitsResult = { data: [] };
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
    const { current } = run({ eventsState });
    expect(current.gaps).toEqual([{ start: NOW, end: new Date("2026-08-05T22:00:00.000-03:00") }]);
  });

  it("sin calendario de Google conectado, el cálculo sigue igual con tareas y hábitos", () => {
    habitsResult = { data: [habit({ scheduled_time: "13:00:00", duration_minutes: 30 })] };
    const { current } = run({ eventsState: { status: "not_connected" } });
    expect(current.gaps[0]).toEqual({ start: NOW, end: new Date("2026-08-05T16:00:00.000Z") });
  });

  it("con Google caído (unavailable), el cálculo sigue igual", () => {
    habitsResult = { data: [] };
    const { current } = run({ eventsState: { status: "unavailable", reason: "transient" } });
    expect(current.gaps).toEqual([{ start: NOW, end: new Date("2026-08-05T22:00:00.000-03:00") }]);
  });

  it("un hábito completado o salteado hoy no ocupa ni suma", () => {
    habitsResult = {
      data: [
        habit({ id: "h-done", completed_today: true, scheduled_time: "13:00:00" }),
        habit({ id: "h-skip", completed_today: false, scheduled_time: null }),
      ],
    };
    skipsResult = { data: { "h-skip": true } };
    const { current } = run();
    expect(current.gaps).toEqual([{ start: NOW, end: new Date("2026-08-05T22:00:00.000-03:00") }]);
    expect(current.unassignedItems).toEqual([]);
  });

  it("el día ya terminó: sin huecos", () => {
    habitsResult = { data: [] };
    const { current } = run({ now: new Date("2026-08-06T01:30:00.000Z") /* 22:30 local */ });
    expect(current.dayEnded).toBe(true);
    expect(current.gaps).toEqual([]);
  });
});
