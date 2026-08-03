// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { HoyEventsResult } from "@/components/calendar/use-hoy-events";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { defaultOptionsForViewKey, type ViewOptions } from "@/lib/view-options/schema";
import { ComposeContextProvider } from "./compose-context";
import { TaskDetailProvider } from "./task-detail-context";
import { HoyView } from "./hoy-view";

/**
 * Grupo 1 (el desacople) y grupo 2 (el orden) de
 * `openspec/changes/hoy-con-eventos-y-formatos/tasks.md`, tarea 6.12: Hoy
 * tenía una sola prueba, sobre centrado. Estas cubren lo que más fácil se
 * rompe sin querer al fusionar tareas y eventos: que las tareas nunca
 * esperen a Google, y que el orden de los tres tramos sea el que pide D-A.
 *
 * A propósito, este archivo nunca importa el tipo del evento del módulo de
 * eventos de `lib/calendar/`: vive en `components/tasks/`, bajo la misma
 * guardia que `lib/calendar/tasks-and-habits-never-publish-to-google.test.ts`
 * escanea (ver el comentario de `hoy-view.tsx`). El tipo del evento de
 * prueba sale de `HoyEventsResult` (`components/calendar/use-hoy-events.ts`).
 */

type TestEvent = Extract<HoyEventsResult, { status: "ok" }>["events"][number];

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
  defaultProjectId: null,
};

let currentOptions: ViewOptions;
let hoyEventsResult: HoyEventsResult;

vi.mock("@/lib/tasks/use-hoy-tasks", () => ({
  useHoyTasks: () => ({ data: currentTasks }),
}));

vi.mock("@/lib/habits/use-habits", () => ({ useHabits: () => ({ data: [] }) }));
vi.mock("@/lib/habits/schedule-overrides", () => ({ useHabitScheduleOverridesForDate: () => ({ data: {} }) }));
vi.mock("@/components/view-options/view-options-bar", () => ({ ViewOptionsBar: () => null }));
vi.mock("@/lib/view-options/use-view-options", () => ({
  useViewOptions: (_viewKey: string, initialOptions: unknown) => ({ options: currentOptions ?? initialOptions }),
}));
vi.mock("@/lib/projects/use-projects", () => ({ useProjects: () => ({ data: [] }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/lib/calendar/use-delete-event", () => ({ useDeleteEvent: () => ({ mutate: vi.fn() }) }));

// `TaskRow` (montada directa por la secuencia mezclada, y también dentro de
// `TaskGroupList`) trae cuatro mutaciones de tarea y una consulta mayorista
// de secciones: ajenas al propósito de estas pruebas (orden y desacople),
// mismo criterio que `screen-calendar.test.tsx` mockea las suyas.
vi.mock("@/lib/tasks/mutations", () => ({
  useUpdateTask: () => ({ mutate: vi.fn() }),
  useMoveTask: () => ({ mutate: vi.fn() }),
  useDuplicateTask: () => ({ mutate: vi.fn() }),
  useDeleteTask: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/lib/sections/use-sections", () => ({ useAllSections: () => ({ data: [] }), useSections: () => ({ data: [] }) }));
vi.mock("@/lib/tasks/use-tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tasks/use-tasks")>();
  return { ...actual, useTasks: () => ({ data: [] }) };
});

// El puente hacia `lib/calendar/` (D-D/D-E): controlable por prueba, para
// simular "cargando", "sin conectar", "Google caído" y "ok" sin tocar
// `useTodayEvents`/`useGoogleCalendars` reales.
vi.mock("@/components/calendar/use-hoy-events", () => ({
  useHoyEvents: () => hoyEventsResult,
}));

let currentTasks: TaskRowData[] = [];

function task(overrides: Partial<TaskRowData> = {}): TaskRowData {
  return {
    id: "task-1",
    project_id: "project-1",
    section_id: null,
    parent_id: null,
    title: "Tarea",
    priority: 4,
    due_date: null,
    due_at: null,
    duration_minutes: null,
    deadline: null,
    completed_at: null,
    position: 1000,
    labels: [],
    ...overrides,
  };
}

function event(overrides: Partial<TestEvent> = {}): TestEvent {
  return {
    id: "event-1",
    calendarId: "cal-1",
    calendarColor: "#a4bdfc",
    title: "Evento",
    description: null,
    location: null,
    allDay: false,
    start: "2026-08-05T11:00:00.000Z",
    end: "2026-08-05T12:00:00.000Z",
    timeZone: "America/Argentina/Buenos_Aires",
    isRecurring: false,
    recurringEventId: null,
    originalStartTime: null,
    htmlLink: null,
    ...overrides,
  };
}

/** Estado "ok" completo del puente `useHoyEvents`, con `calendarName`/`canEdit` de verdad (D-D) en vez de un `as` que taparía el error. */
function eventsOk(events: TestEvent[]): HoyEventsResult {
  return {
    status: "ok",
    events,
    calendarName: () => "Trabajo",
    canEdit: () => true,
  };
}

function renderHoy(tasks: TaskRowData[], events: HoyEventsResult, optionsOverride: Partial<ViewOptions> = {}) {
  currentTasks = tasks;
  hoyEventsResult = events;
  currentOptions = { ...defaultOptionsForViewKey("hoy"), ...optionsOverride };
  return render(
    <PreferencesProvider preferences={TEST_PREFERENCES}>
      <TaskDetailProvider>
        <ComposeContextProvider>
          <HoyView
            userId="user-1"
            timezone="America/Argentina/Buenos_Aires"
            inboxProjectId={null}
            initialTasks={tasks}
            initialHabits={[]}
            nowIso="2026-08-05T15:00:00.000Z"
            todayDate="2026-08-05"
            initialOptions={currentOptions}
          />
        </ComposeContextProvider>
      </TaskDetailProvider>
    </PreferencesProvider>,
  );
}

/** Posición relativa de dos textos en el documento renderizado, para verificar orden sin depender de la estructura exacta del DOM. */
function indexOfText(container: HTMLElement, text: string): number {
  const index = (container.textContent ?? "").indexOf(text);
  expect(index).toBeGreaterThanOrEqual(0);
  return index;
}

describe("HoyView — centrado", () => {
  it("aplica mx-auto junto con max-w-content al encabezado y al contenido", () => {
    const { container } = renderHoy([], { status: "not_connected" });
    const contentDivs = container.querySelectorAll(".max-w-content");
    expect(contentDivs).toHaveLength(2);
    contentDivs.forEach((div) => {
      expect(div).toHaveClass("max-w-content", "mx-auto");
    });
  });
});

describe("HoyView — el desacople con Google (grupo 1)", () => {
  it("las tareas se pintan aunque los eventos todavía estén cargando", () => {
    renderHoy([task({ title: "Pagar el alquiler", due_date: "2026-08-05" })], { status: "loading" });
    expect(screen.getByText("Pagar el alquiler")).toBeInTheDocument();
    expect(screen.queryByText(/no respondió|reconectarse/)).not.toBeInTheDocument();
  });

  it("sin Google conectado, Hoy se ve exactamente igual que sin esta capacidad: sin huecos ni avisos", () => {
    renderHoy([task({ title: "Pagar el alquiler", due_date: "2026-08-05" })], { status: "not_connected" });
    expect(screen.getByText("Pagar el alquiler")).toBeInTheDocument();
    expect(screen.queryByText(/no respondió|reconectarse/)).not.toBeInTheDocument();
  });

  it("con Google caído, las tareas se ven igual y aparece un solo aviso al pie (nunca uno por fila)", () => {
    renderHoy(
      [task({ id: "t1", title: "Pagar el alquiler", due_date: "2026-08-05" }), task({ id: "t2", title: "Llamar al contador", due_date: "2026-08-05" })],
      { status: "unavailable", reason: "transient" },
    );
    expect(screen.getByText("Pagar el alquiler")).toBeInTheDocument();
    expect(screen.getByText("Llamar al contador")).toBeInTheDocument();
    expect(screen.getAllByText(/no respondió/)).toHaveLength(1);
  });

  it("distingue 'no conectado' de 'falló': solo el segundo avisa", () => {
    const { rerender } = renderHoy([], { status: "not_connected" });
    expect(screen.queryByText(/no respondió|reconectarse/)).not.toBeInTheDocument();

    hoyEventsResult = { status: "unavailable", reason: "needs_reauth" };
    rerender(
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <TaskDetailProvider>
          <ComposeContextProvider>
            <HoyView
              userId="user-1"
              timezone="America/Argentina/Buenos_Aires"
              inboxProjectId={null}
              initialTasks={[]}
              initialHabits={[]}
              nowIso="2026-08-05T15:00:00.000Z"
              todayDate="2026-08-05"
              initialOptions={currentOptions}
            />
          </ComposeContextProvider>
        </TaskDetailProvider>
      </PreferencesProvider>,
    );
    expect(screen.getByText(/necesita reconectarse/)).toBeInTheDocument();
  });

  it("un evento de hoy sin tareas igual se muestra (no hace falta ninguna tarea para ver el día)", () => {
    renderHoy([], eventsOk([event({ title: "Reunión", allDay: true, start: "2026-08-05" })]));
    expect(screen.getByText("Reunión")).toBeInTheDocument();
    expect(screen.queryByText("No tenés tareas para hoy.")).not.toBeInTheDocument();
  });
});

describe("HoyView — el orden de los tres tramos (D-A, grupo 2)", () => {
  it("por default (orden por fecha, sin agrupar): todo el día primero, después con hora mezclado por instante, después sin hora", () => {
    const { container } = renderHoy(
      [
        task({ id: "pay-rent", title: "Pagar el alquiler", due_at: "2026-08-05T09:00:00.000Z" }), // 06:00 BA
        task({ id: "undated", title: "Llamar al contador", due_date: "2026-08-05" }),
      ],
      eventsOk([
        event({ id: "holiday", title: "Feriado", allDay: true, start: "2026-08-05" }),
        event({ id: "meeting", title: "Reunión con el equipo", start: "2026-08-05T11:00:00.000Z" }), // 08:00 BA
      ]),
    );

    const holiday = indexOfText(container, "Feriado");
    const payRent = indexOfText(container, "Pagar el alquiler");
    const meeting = indexOfText(container, "Reunión con el equipo");
    const undated = indexOfText(container, "Llamar al contador");

    expect(holiday).toBeLessThan(payRent);
    expect(payRent).toBeLessThan(meeting);
    expect(meeting).toBeLessThan(undated);
  });

  it("empate a la misma hora: el evento va primero", () => {
    const sameInstant = "2026-08-05T14:00:00.000Z";
    const { container } = renderHoy(
      [task({ id: "pay-rent", title: "Pagar el alquiler", due_at: sameInstant })],
      eventsOk([event({ id: "meeting", title: "Reunión con el equipo", start: sameInstant })]),
    );

    expect(indexOfText(container, "Reunión con el equipo")).toBeLessThan(indexOfText(container, "Pagar el alquiler"));
  });

  it("un evento que empezó ayer va al primer tramo, y no muestra la hora de ayer", () => {
    const { container } = renderHoy(
      [task({ id: "undated", title: "Llamar al contador", due_date: "2026-08-05" })],
      eventsOk([event({ id: "carried-over", title: "Reunión de ayer", start: "2026-08-04T23:30:00.000-03:00" })]),
    );

    expect(screen.getByText("Reunión de ayer")).toBeInTheDocument();
    // El defecto real (tarea 6.6): mostraba "23:30 – 09:00", la hora cruda
    // de ayer, como si el evento durara seis horas al revés hoy. Ahora se
    // lee "Desde ayer" y la hora en la que termina; la hora de ayer no
    // aparece en ningún nodo del documento (chequeo por texto completo, no
    // por una coincidencia exacta que un nodo compuesto nunca cumple).
    expect(screen.getByText("Desde ayer · hasta las 09:00")).toBeInTheDocument();
    expect(container.textContent).not.toContain("23:30");
    expect(indexOfText(container, "Reunión de ayer")).toBeLessThan(indexOfText(container, "Llamar al contador"));
  });

  it("las atrasadas nunca se mezclan con la secuencia de hoy", () => {
    const { container } = renderHoy(
      [
        task({ id: "overdue", title: "Tarea atrasada", due_date: "2026-08-01" }),
        task({ id: "today-task", title: "Tarea de hoy", due_date: "2026-08-05" }),
      ],
      eventsOk([event({ id: "meeting", title: "Reunión con el equipo", start: "2026-08-05T11:00:00.000Z" })]),
    );

    expect(screen.getByText("Atrasadas")).toBeInTheDocument();
    const overdueHeading = indexOfText(container, "Atrasadas");
    const overdueTask = indexOfText(container, "Tarea atrasada");
    const meeting = indexOfText(container, "Reunión con el equipo");
    expect(overdueHeading).toBeLessThan(overdueTask);
    expect(overdueTask).toBeLessThan(meeting);
  });

  it("con un orden distinto de 'fecha' (D-A, tarea 2.6), los eventos no se intercalan por hora: van aparte, arriba, y las tareas siguen el criterio elegido", () => {
    const { container } = renderHoy(
      [
        task({ id: "b-task", title: "Bañar al perro", due_date: "2026-08-05" }),
        task({ id: "a-task", title: "Actualizar el currículum", due_date: "2026-08-05" }),
      ],
      eventsOk([event({ id: "meeting", title: "Reunión con el equipo", start: "2026-08-05T20:00:00.000Z" })]), // 17:00 BA, más tarde que las dos tareas
      { order: "nombre" },
    );

    const meeting = indexOfText(container, "Reunión con el equipo");
    const aTask = indexOfText(container, "Actualizar el currículum");
    const bTask = indexOfText(container, "Bañar al perro");
    // El evento va primero (aparte, no por hora) y las tareas quedan
    // ordenadas por nombre entre sí, no por su hora de vencimiento (que no
    // tienen, en este caso).
    expect(meeting).toBeLessThan(aTask);
    expect(aTask).toBeLessThan(bTask);
  });
});

describe("HoyView — formatos (D-F)", () => {
  it("panel: muestra solo tareas y avisa que no muestra los eventos de hoy", () => {
    renderHoy(
      [task({ id: "t1", title: "Pagar el alquiler", due_date: "2026-08-05" })],
      eventsOk([event({ title: "Reunión con el equipo" })]),
      { viewShape: "panel" },
    );

    expect(screen.getByText("Pagar el alquiler")).toBeInTheDocument();
    expect(screen.queryByText("Reunión con el equipo")).not.toBeInTheDocument();
    expect(screen.getByText(/no muestra los eventos de hoy/)).toBeInTheDocument();
  });

  it("panel: sin eventos hoy, no avisa nada", () => {
    renderHoy([task({ id: "t1", title: "Pagar el alquiler", due_date: "2026-08-05" })], eventsOk([]), { viewShape: "panel" });
    expect(screen.queryByText(/no muestra los eventos de hoy/)).not.toBeInTheDocument();
  });
});
