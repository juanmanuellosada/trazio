// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Habit } from "@/lib/habits/habit-columns";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { ShortcutRegistryContext } from "@/lib/shortcuts/context";
import type { ShortcutScope } from "@/lib/shortcuts/types";
import { TaskDetailProvider, useTaskDetail } from "@/components/tasks/task-detail-context";
import type { HoyEventsResult } from "./use-hoy-events";
import { QueHagoAhoraButton } from "./que-hago-ahora-button";

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

/** Expone el `taskId` que el detalle abrió, sin montar el panel entero (ajeno al propósito de este archivo). */
function OpenTaskIdProbe() {
  const { openTaskId } = useTaskDetail();
  return <p data-testid="open-task-id">{openTaskId ?? "ninguna"}</p>;
}

function renderButton(overrides: Partial<Parameters<typeof QueHagoAhoraButton>[0]> = {}) {
  return render(
    <TaskDetailProvider>
      <QueHagoAhoraButton
        todayDate={TODAY}
        timezone={TIMEZONE}
        timeFormat={24}
        now={NOW}
        dayEndTime={DAY_END_TIME}
        tasks={[]}
        initialHabits={[]}
        eventsState={NOT_CONNECTED}
        {...overrides}
      />
      <OpenTaskIdProbe />
    </TaskDetailProvider>,
  );
}

beforeEach(() => {
  habitsResult = { data: [] };
  skipsResult = { data: {} };
});

describe("QueHagoAhoraButton", () => {
  it("sin ninguna candidata: avisa que no hay hueco disponible con nada que proponer", async () => {
    const user = userEvent.setup();
    renderButton();

    await user.click(screen.getByRole("button", { name: "¿Qué hago ahora?" }));

    expect(screen.getByText("No tenés ninguna tarea que entre en este hueco.")).toBeInTheDocument();
  });

  it("el próximo bloque empieza en menos de 5 minutos: dice hasta qué hora está ocupado", async () => {
    const user = userEvent.setup();
    const soon = task({ id: "t-soon", due_date: null, due_at: "2026-08-05T15:03:00.000Z", duration_minutes: 30 });
    renderButton({ tasks: [soon] });

    await user.click(screen.getByRole("button", { name: "¿Qué hago ahora?" }));

    expect(screen.getByText("Estás ocupado hasta las 12:03.")).toBeInTheDocument();
  });

  it("el día ya terminó: lo dice, sin proponer nada", async () => {
    const user = userEvent.setup();
    renderButton({ now: new Date("2026-08-06T01:30:00.000Z") /* 22:30 local */ });

    await user.click(screen.getByRole("button", { name: "¿Qué hago ahora?" }));

    expect(screen.getByText("El día ya terminó.")).toBeInTheDocument();
  });

  it("propone una tarea que entra en el hueco; hacer clic la abre en el detalle y cierra el popover", async () => {
    const user = userEvent.setup();
    const candidate = task({ id: "t-candidata", title: "Escribir el informe", duration_minutes: 45 });
    renderButton({ tasks: [candidate] });

    await user.click(screen.getByRole("button", { name: "¿Qué hago ahora?" }));
    expect(screen.getByText("Escribir el informe")).toBeInTheDocument();
    expect(screen.getByText("45m")).toBeInTheDocument();

    await user.click(screen.getByText("Escribir el informe"));

    expect(screen.getByTestId("open-task-id")).toHaveTextContent("t-candidata");
    expect(screen.queryByText("Escribir el informe")).not.toBeInTheDocument();
  });

  it("el atajo de teclado abre el mismo popover que el botón", () => {
    let pushedScope: ShortcutScope | null = null;
    const candidate = task({ id: "t-candidata", title: "Escribir el informe", duration_minutes: 45 });

    render(
      <ShortcutRegistryContext.Provider
        value={{
          pushScope: (scope) => {
            pushedScope = scope;
            return () => {};
          },
        }}
      >
        <TaskDetailProvider>
          <QueHagoAhoraButton
            todayDate={TODAY}
            timezone={TIMEZONE}
            timeFormat={24}
            now={NOW}
            dayEndTime={DAY_END_TIME}
            tasks={[candidate]}
            initialHabits={[]}
            eventsState={NOT_CONNECTED}
          />
        </TaskDetailProvider>
      </ShortcutRegistryContext.Provider>,
    );

    expect(screen.queryByText("Escribir el informe")).not.toBeInTheDocument();
    act(() => {
      pushedScope!.current[0].handler(new KeyboardEvent("keydown", { key: "a" }));
    });

    expect(screen.getByText("Escribir el informe")).toBeInTheDocument();
  });
});
