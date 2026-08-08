// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { HoyEventsResult } from "@/components/calendar/use-hoy-events";
import type { Habit } from "@/lib/habits/habit-columns";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import type { SectionRow } from "@/lib/sections/use-sections";
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

vi.mock("@/lib/habits/use-habits", () => ({ useHabits: () => ({ data: currentHabits }) }));
vi.mock("@/lib/habits/schedule-overrides", () => ({ useHabitScheduleOverridesForDate: () => ({ data: {} }) }));
vi.mock("@/lib/habits/skips", () => ({ useHabitSkipsForDate: () => ({ data: currentSkips }) }));
vi.mock("@/lib/habits/mutations", () => ({
  useMarkHabitDone: () => ({ mutate: vi.fn(), isPending: false }),
  useUnmarkHabitDone: () => ({ mutate: vi.fn(), isPending: false }),
}));
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
// `updateTaskMutate`/`moveTaskMutate` quedan estables entre renders (a
// diferencia de un `vi.fn()` nuevo por llamada) para que el grupo "panel —
// cableado" de más abajo pueda comprobar qué patch escribió cada mover.
const updateTaskMutate = vi.fn();
const moveTaskMutate = vi.fn();
vi.mock("@/lib/tasks/mutations", () => ({
  useUpdateTask: () => ({ mutate: updateTaskMutate }),
  useMoveTask: () => ({ mutate: moveTaskMutate }),
  useDuplicateTask: () => ({ mutate: vi.fn() }),
  useDeleteTask: () => ({ mutate: vi.fn() }),
}));
let currentAllSections: SectionRow[] = [];
vi.mock("@/lib/sections/use-sections", () => ({
  useAllSections: () => ({ data: currentAllSections }),
  useSections: () => ({ data: [] }),
}));
vi.mock("@/lib/tasks/use-tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tasks/use-tasks")>();
  return { ...actual, useTasks: () => ({ data: [] }) };
});

// Panel (grupo "cableado" de más abajo, hueco 7.2 de `tasks.md`): `Board` se
// mockea para invocar `onMoveAcrossColumns`/`onReorderWithinColumn` directo,
// sin simular un arrastre real de `@dnd-kit` (no funciona sobre jsdom, y el
// navegador ya lo verifica de verdad, tarea 7.3). Sigue mostrando los
// títulos de tarea, para no romper las pruebas de "formatos (D-F)" de más
// abajo que ya dependían del `Board` real.
type BoardMockProps = {
  columns: { id: string; title: string; tasks: TaskRowData[] }[];
  onReorderWithinColumn: (columnId: string, taskId: string, position: number) => void;
  onMoveAcrossColumns: (taskId: string, fromColumnId: string, toColumnId: string) => void;
};
let lastBoardProps: BoardMockProps | null = null;
vi.mock("@/components/board/board", () => ({
  Board: (props: BoardMockProps) => {
    lastBoardProps = props;
    return (
      <div data-testid="board">
        {props.columns.map((column) => (
          <div key={column.id} data-testid={`column-${column.id}`}>
            <h3>{column.title}</h3>
            <span>{column.tasks.length}</span>
            <ul>
              {column.tasks.map((t) => (
                <li key={t.id}>{t.title}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  },
}));

// El puente hacia `lib/calendar/` (D-D/D-E): controlable por prueba, para
// simular "cargando", "sin conectar", "Google caído" y "ok" sin tocar
// `useTodayEvents`/`useGoogleCalendars` reales.
vi.mock("@/components/calendar/use-hoy-events", () => ({
  useHoyEvents: () => hoyEventsResult,
}));

let currentTasks: TaskRowData[] = [];
let currentHabits: Habit[] = [];
let currentSkips: Record<string, boolean> = {};

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

beforeEach(() => {
  updateTaskMutate.mockClear();
  moveTaskMutate.mockClear();
  currentAllSections = [];
  currentHabits = [];
  currentSkips = {};
  lastBoardProps = null;
});

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

  it("un agrupador guardado de antes de esta capacidad no agrupa la lista de Hoy (D-E, lista-con-mas-agrupadores): ninguna cabecera de grupo aparece", () => {
    renderHoy(
      [
        task({ id: "urgente", title: "Tarea urgente", priority: 1, due_date: "2026-08-05" }),
        task({ id: "baja", title: "Tarea de baja prioridad", priority: 4, due_date: "2026-08-05" }),
      ],
      eventsOk([]),
      // "nombre" saca la secuencia por default (D-A) y deja ver `TaskGroupList`,
      // al que Hoy le pasa "nada" fijo sin importar `groupBy` guardado.
      { order: "nombre", groupBy: "prioridad" },
    );

    expect(screen.getByText("Tarea urgente")).toBeInTheDocument();
    expect(screen.getByText("Tarea de baja prioridad")).toBeInTheDocument();
    expect(screen.queryByText("Urgente")).not.toBeInTheDocument();
    expect(screen.queryByText("Baja")).not.toBeInTheDocument();
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

/**
 * Hueco 7.2 de `openspec/changes/panel-con-columnas-por-campo/tasks.md`: el
 * cableado del panel de Hoy (caso especial de D-A: "nada" es prioridad, no
 * lo natural de otra pantalla) no tenía ninguna prueba propia más allá de
 * "formatos (D-F)" de arriba — se había verificado a mano en el navegador.
 */
describe("HoyView — panel, 'nada' es prioridad (caso especial de D-A)", () => {
  it("agrupando por 'nada', las columnas son las cuatro prioridades fijas", () => {
    renderHoy([task({ id: "t1", title: "Tarea urgente", priority: 1, due_date: "2026-08-05" })], eventsOk([]), {
      viewShape: "panel",
      groupBy: "nada",
    });

    const titles = lastBoardProps!.columns.map((c) => c.title);
    expect(titles).toEqual(["Urgente", "Alta", "Media", "Baja"]);
  });
});

describe("HoyView — cambiar el agrupador cambia las columnas", () => {
  it("'fecha' produce columnas por día en vez de por prioridad", () => {
    renderHoy([task({ id: "t1", title: "Tarea", due_date: "2026-08-05" })], eventsOk([]), {
      viewShape: "panel",
      groupBy: "fecha",
    });

    const titles = lastBoardProps!.columns.map((c) => c.title);
    expect(titles).not.toEqual(["Urgente", "Alta", "Media", "Baja"]);
    expect(titles[titles.length - 1]).toBe("Sin fecha");
  });

  it("'sección' se trata como 'nada' en Hoy (D-C: Hoy cruza proyectos, sección no tiene salida ahí), sin pisar la preferencia guardada", () => {
    renderHoy([task({ id: "t1", title: "Tarea", section_id: "s1", due_date: "2026-08-05" })], eventsOk([]), {
      viewShape: "panel",
      groupBy: "seccion",
    });

    // En Hoy, "nada" es prioridad (caso especial de D-A) — "sección" cae ahí, igual que "etiqueta".
    expect(lastBoardProps!.columns.map((c) => c.title)).toEqual(["Urgente", "Alta", "Media", "Baja"]);
  });
});

describe("HoyView — mover entre columnas escribe el campo correcto (D-C)", () => {
  it("mover a otra columna de prioridad escribe priority", () => {
    renderHoy([task({ id: "t1", title: "Tarea", priority: 4, due_date: "2026-08-05" })], eventsOk([]), {
      viewShape: "panel",
      groupBy: "nada",
    });

    lastBoardProps!.onMoveAcrossColumns("t1", "4", "1");

    expect(updateTaskMutate).toHaveBeenCalledWith({ id: "t1", projectId: "project-1", patch: { priority: 1 } });
  });
});

describe("HoyView — reordenar dentro de una columna nunca persiste (D25, Hoy cruza proyectos)", () => {
  it("reordenar dentro de una columna no escribe nada, sin importar el orden", () => {
    renderHoy([task({ id: "t1", title: "Tarea", due_date: "2026-08-05" })], eventsOk([]), {
      viewShape: "panel",
      groupBy: "nada",
      order: "manual",
    });

    lastBoardProps!.onReorderWithinColumn("4", "t1", 500);

    expect(moveTaskMutate).not.toHaveBeenCalled();
    expect(updateTaskMutate).not.toHaveBeenCalled();
  });
});

describe("HoyView — tiempo planificado del día (capacidad carga-del-dia, D-B/D-C)", () => {
  it("todo con duración: solo el total, en el encabezado", () => {
    renderHoy([task({ id: "t1", title: "Tarea", due_date: "2026-08-05", duration_minutes: 90 })], eventsOk([]));
    expect(screen.getByText("1h 30m planificadas")).toBeInTheDocument();
  });

  it("algo sin duración: el total lo dice aparte, nunca en silencio", () => {
    renderHoy(
      [
        task({ id: "t1", title: "Con duración", due_date: "2026-08-05", duration_minutes: 60 }),
        task({ id: "t2", title: "Sin duración", due_date: "2026-08-05", duration_minutes: null }),
      ],
      eventsOk([]),
    );
    expect(screen.getByText("1h planificadas · 1 sin duración")).toBeInTheDocument();
  });

  it("nada tiene duración: solo el conteo, nunca '0m planificadas'", () => {
    renderHoy([task({ id: "t1", title: "Sin duración", due_date: "2026-08-05", duration_minutes: null })], eventsOk([]));
    expect(screen.getByText("1 sin duración")).toBeInTheDocument();
    expect(screen.queryByText(/0m planificadas/)).not.toBeInTheDocument();
  });

  it("las atrasadas suman en Hoy y el texto lo indica", () => {
    renderHoy(
      [
        task({ id: "overdue", title: "Atrasada", due_date: "2026-08-01", duration_minutes: 30 }),
        task({ id: "today", title: "De hoy", due_date: "2026-08-05", duration_minutes: 30 }),
      ],
      eventsOk([]),
    );
    expect(screen.getByText("1h planificadas (incluye atrasadas)")).toBeInTheDocument();
  });

  it("sin calendario conectado, el total se muestra igual con tareas y hábitos", () => {
    currentHabits = [habit({ duration_minutes: 15 })];
    renderHoy([task({ id: "t1", title: "Tarea", due_date: "2026-08-05", duration_minutes: 45 })], {
      status: "not_connected",
    });
    expect(screen.getByText("1h planificadas")).toBeInTheDocument();
  });

  it("un hábito salteado no suma al total", () => {
    currentHabits = [habit({ id: "h-skip", duration_minutes: 20 })];
    currentSkips = { "h-skip": true };
    renderHoy([task({ id: "t1", title: "Tarea", due_date: "2026-08-05", duration_minutes: 40 })], eventsOk([]));
    expect(screen.getByText("40m planificadas")).toBeInTheDocument();
  });

  it("día sin ningún elemento: no muestra ningún total", () => {
    renderHoy([], { status: "not_connected" });
    expect(screen.queryByText(/planificad/)).not.toBeInTheDocument();
    expect(screen.queryByText(/sin duración/)).not.toBeInTheDocument();
  });
});
