// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Habit } from "@/lib/habits/habit-columns";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { HoyEventsResult } from "./use-hoy-events";
import { useDayLoad } from "./use-day-load";

let habitsResult: { data: Habit[] | undefined } = { data: [] };
const skipsResult: { data: Record<string, boolean> | undefined } = { data: {} };

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

describe("useDayLoad (carga-del-dia): tiempo libre y pedido sin lugar", () => {
  it("sin nada pendiente: todo el resto del día es tiempo libre", () => {
    habitsResult = { data: [] };
    const { result } = renderHook(() =>
      useDayLoad({ todayDate: TODAY, timezone: TIMEZONE, now: NOW, dayEndTime: DAY_END_TIME, tasks: [], initialHabits: [], eventsState: NOT_CONNECTED }),
    );

    // De las 12:00 a las 22:00 locales: 10 horas.
    expect(result.current).toEqual({ freeMinutes: 600, dayEnded: false, unassigned: { totalMinutes: 0, withoutDuration: 0 } });
  });

  it("una tarea con hora resta tiempo libre, una sin hora suma al pedido sin lugar", () => {
    habitsResult = { data: [] };
    const timed = task({ id: "timed", due_date: null, due_at: "2026-08-05T18:00:00.000Z", duration_minutes: 60 });
    const untimed = task({ id: "untimed", duration_minutes: 45 });

    const { result } = renderHook(() =>
      useDayLoad({
        todayDate: TODAY,
        timezone: TIMEZONE,
        now: NOW,
        dayEndTime: DAY_END_TIME,
        tasks: [timed, untimed],
        initialHabits: [],
        eventsState: NOT_CONNECTED,
      }),
    );

    // 600 minutos totales - 60 de la tarea con hora = 540.
    expect(result.current).toEqual({ freeMinutes: 540, dayEnded: false, unassigned: { totalMinutes: 45, withoutDuration: 0 } });
  });

  it("una tarea sin duración se cuenta aparte, no suma al pedido sin lugar", () => {
    habitsResult = { data: [] };
    const { result } = renderHook(() =>
      useDayLoad({
        todayDate: TODAY,
        timezone: TIMEZONE,
        now: NOW,
        dayEndTime: DAY_END_TIME,
        tasks: [task({ duration_minutes: 30 }), task({ id: "sin-duracion", duration_minutes: null })],
        initialHabits: [],
        eventsState: NOT_CONNECTED,
      }),
    );

    expect(result.current.unassigned).toEqual({ totalMinutes: 30, withoutDuration: 1 });
  });

  it("el día ya terminó: tiempo libre en cero, nunca negativo", () => {
    habitsResult = { data: [] };
    const { result } = renderHook(() =>
      useDayLoad({
        todayDate: TODAY,
        timezone: TIMEZONE,
        now: new Date("2026-08-06T01:30:00.000Z") /* 22:30 local, después de las 22:00 */,
        dayEndTime: DAY_END_TIME,
        tasks: [],
        initialHabits: [],
        eventsState: NOT_CONNECTED,
      }),
    );

    expect(result.current.freeMinutes).toBe(0);
    expect(result.current.dayEnded).toBe(true);
  });

  it("sin calendario de Google conectado, el cálculo sale igual con tareas y hábitos", () => {
    habitsResult = { data: [] };
    const { result } = renderHook(() =>
      useDayLoad({
        todayDate: TODAY,
        timezone: TIMEZONE,
        now: NOW,
        dayEndTime: DAY_END_TIME,
        tasks: [task({ id: "timed", due_date: null, due_at: "2026-08-05T18:00:00.000Z", duration_minutes: 60 })],
        initialHabits: [],
        eventsState: { status: "not_connected" },
      }),
    );

    expect(result.current.freeMinutes).toBe(540);
  });
});
