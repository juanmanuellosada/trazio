// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Habit } from "@/lib/habits/habit-columns";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { HoyEventsResult } from "./use-hoy-events";
import { useNextTask } from "./use-next-task";

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

function run(overrides: Partial<Parameters<typeof useNextTask>[0]> = {}) {
  return renderHook(() =>
    useNextTask({
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

describe("useNextTask", () => {
  it("día terminado: ni siquiera busca hueco", () => {
    habitsResult = { data: [] };
    const { current } = run({ now: new Date("2026-08-06T01:30:00.000Z") /* 22:30 local */ });
    expect(current).toEqual({ status: "day-ended" });
  });

  it("el próximo bloque empieza en menos de 5 minutos: ocupado hasta esa hora", () => {
    habitsResult = { data: [] };
    const timed = task({ id: "t-soon", due_date: null, due_at: "2026-08-05T15:03:00.000Z", duration_minutes: 30 });
    const { current } = run({ tasks: [timed] });
    expect(current).toEqual({ status: "no-gap", until: new Date("2026-08-05T15:03:00.000Z") });
  });

  it("sin ningún bloque agendado y sin candidatas: no hay ninguna tarea que entre", () => {
    habitsResult = { data: [] };
    const { current } = run();
    expect(current).toEqual({ status: "no-candidate" });
  });

  it("hay hueco pero la única candidata no entra por duración", () => {
    habitsResult = { data: [] };
    const tooLong = task({ id: "t-largo", duration_minutes: 700 });
    const { current } = run({ tasks: [tooLong] });
    expect(current).toEqual({ status: "no-candidate" });
  });

  it("propone la candidata atrasada por sobre la que vence hoy", () => {
    habitsResult = { data: [] };
    const dueToday = task({ id: "hoy", due_date: TODAY, duration_minutes: 20 });
    const overdue = task({ id: "atrasada", due_date: "2026-08-01", duration_minutes: 20 });
    const { current } = run({ tasks: [dueToday, overdue] });
    expect(current).toEqual({ status: "proposal", task: overdue });
  });

  it("una tarea sin duración nunca se propone", () => {
    habitsResult = { data: [] };
    const noDuration = task({ id: "sin-duracion", duration_minutes: null });
    const { current } = run({ tasks: [noDuration] });
    expect(current).toEqual({ status: "no-candidate" });
  });

  it("sin calendario de Google conectado, igual propone si hay candidata", () => {
    habitsResult = { data: [] };
    const candidate = task({ id: "candidata", duration_minutes: 20 });
    const { current } = run({ tasks: [candidate], eventsState: { status: "not_connected" } });
    expect(current).toEqual({ status: "proposal", task: candidate });
  });
});
