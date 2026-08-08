// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { ComposeContextProvider } from "@/components/tasks/compose-context";
import { TaskDetailProvider } from "@/components/tasks/task-detail-context";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { SectionRow } from "@/lib/sections/use-sections";
import { defaultOptionsForViewKey, type ViewOptions } from "@/lib/view-options/schema";
import type { BoardColumn } from "@/components/board/board";
import { ProximosView } from "./proximos-view";

/**
 * Hueco 7.2 de `openspec/changes/panel-con-columnas-por-campo/tasks.md`:
 * `ProximosView` no tenía ninguna prueba propia de su panel — se había
 * verificado a mano en el navegador. Mismo criterio que
 * `sectioned-tasks.test.tsx`: `Board` se mockea para invocar sus
 * manejadores directo, sin simular un arrastre real de `@dnd-kit` (no
 * funciona sobre jsdom, y el navegador ya lo verifica de verdad).
 */

type BoardMockProps = {
  columns: BoardColumn[];
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
          </div>
        ))}
      </div>
    );
  },
}));

vi.mock("@/components/view-options/view-options-bar", () => ({ ViewOptionsBar: () => null }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/lib/projects/use-projects", () => ({ useProjects: () => ({ data: [] }) }));

let currentOptions: ViewOptions;
vi.mock("@/lib/view-options/use-view-options", () => ({
  useViewOptions: (_viewKey: string, initialOptions: unknown) => ({ options: currentOptions ?? initialOptions }),
}));

const updateTaskMutate = vi.fn();
const moveTaskMutate = vi.fn();
vi.mock("@/lib/tasks/mutations", () => ({
  useUpdateTask: () => ({ mutate: updateTaskMutate }),
  useMoveTask: () => ({ mutate: moveTaskMutate }),
  useDuplicateTask: () => ({ mutate: vi.fn() }),
  useDeleteTask: () => ({ mutate: vi.fn() }),
}));

let currentUpcoming: TaskRow[] = [];
let currentUndated: TaskRow[] = [];
let currentAllSections: SectionRow[] = [];
vi.mock("@/lib/tasks/use-upcoming-tasks", () => ({ useUpcomingTasks: () => ({ data: currentUpcoming }) }));
vi.mock("@/lib/tasks/use-undated-tasks", () => ({ useUndatedTasks: () => ({ data: currentUndated }) }));
vi.mock("@/lib/sections/use-sections", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sections/use-sections")>();
  return { ...actual, useAllSections: () => ({ data: currentAllSections }), useSections: () => ({ data: [] }) };
});
vi.mock("@/lib/tasks/use-tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tasks/use-tasks")>();
  return { ...actual, useTasks: () => ({ data: [] }) };
});
// Ajeno al propósito de las pruebas de "tiempo planificado" de más abajo
// (las primeras de este archivo en montar el modo lista de verdad, en vez
// de mockear `Board`): arrastra el contexto del parser, mismo criterio que
// `hoy-view.test.tsx` usa para sus propios mocks ajenos al foco de cada
// grupo de pruebas.
vi.mock("./task-quick-add-row", () => ({ TaskQuickAddRow: () => null }));

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
  defaultProjectId: null,
};

function task(overrides: Partial<TaskRow> & { id: string; title: string }): TaskRow {
  return {
    project_id: "p1",
    section_id: null,
    parent_id: null,
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

function renderProximos(
  upcoming: TaskRow[],
  undated: TaskRow[],
  allSections: SectionRow[] = [],
  optionsOverride: Partial<ViewOptions> = {},
) {
  currentUpcoming = upcoming;
  currentUndated = undated;
  currentAllSections = allSections;
  lastBoardProps = null;
  const initialOptions = { ...defaultOptionsForViewKey("proximos"), ...optionsOverride };
  currentOptions = initialOptions;
  return render(
    <PreferencesProvider preferences={TEST_PREFERENCES}>
      <TaskDetailProvider>
        <ComposeContextProvider>
          <ProximosView
            userId="user-1"
            timezone="America/Argentina/Buenos_Aires"
            inboxProjectId="inbox-1"
            initialTasks={upcoming}
            nowIso="2026-08-05T15:00:00.000Z"
            initialOptions={initialOptions}
          />
        </ComposeContextProvider>
      </TaskDetailProvider>
    </PreferencesProvider>,
  );
}

const allSections: SectionRow[] = [
  { id: "s1", project_id: "p1", name: "Trabajo", description: null, position: 1000, is_collapsed: false },
  { id: "s2", project_id: "p2", name: "Casa", description: null, position: 1000, is_collapsed: false },
];

beforeEach(() => {
  updateTaskMutate.mockClear();
  moveTaskMutate.mockClear();
});

describe("ProximosView — panel, 'nada' es la ventana de días (D-A)", () => {
  it("agrupando por 'nada', las columnas son 'Hoy'/'Mañana' y el resto de la ventana, más 'Sin fecha'", () => {
    renderProximos(
      [task({ id: "t1", title: "Tarea de hoy", due_date: "2026-08-05" })],
      [task({ id: "t2", title: "Sin fecha" })],
      [],
      { viewShape: "panel", groupBy: "nada" },
    );

    const titles = lastBoardProps!.columns.map((c) => c.title);
    expect(titles[0]).toBe("Hoy");
    expect(titles[1]).toBe("Mañana");
    expect(titles[titles.length - 1]).toBe("Sin fecha");
  });
});

describe("ProximosView — cambiar el agrupador cambia las columnas", () => {
  it("'fecha' produce solo los días con tareas, no toda la ventana", () => {
    renderProximos(
      [task({ id: "t1", title: "Tarea", due_date: "2026-08-20" })],
      [],
      [],
      { viewShape: "panel", groupBy: "fecha" },
    );

    const titles = lastBoardProps!.columns.map((c) => c.title);
    // Distinto de "nada": acá no aparece "Hoy"/"Mañana" para días sin tareas.
    expect(titles).not.toContain("Hoy");
    expect(titles[titles.length - 1]).toBe("Sin fecha");
  });

  it("'prioridad' produce las cuatro columnas fijas", () => {
    renderProximos([task({ id: "t1", title: "Tarea", priority: 1, due_date: "2026-08-05" })], [], [], {
      viewShape: "panel",
      groupBy: "prioridad",
    });

    expect(lastBoardProps!.columns.map((c) => c.title)).toEqual(["Urgente", "Alta", "Media", "Baja"]);
  });

  it("'sección' se trata como 'nada' en Próximos (D-C: Próximos cruza proyectos, sección no tiene salida ahí), sin pisar la preferencia guardada", () => {
    renderProximos(
      [task({ id: "t1", title: "Tarea de p1", project_id: "p1", section_id: "s1", due_date: "2026-08-05" })],
      [],
      allSections,
      { viewShape: "panel", groupBy: "seccion" },
    );

    // En Próximos, "nada" es la ventana de días — "sección" cae ahí, igual que "etiqueta".
    const titles = lastBoardProps!.columns.map((c) => c.title);
    expect(titles[0]).toBe("Hoy");
    expect(titles[titles.length - 1]).toBe("Sin fecha");
  });
});

describe("ProximosView — mover entre columnas escribe el campo correcto (D-C)", () => {
  it("agrupado por prioridad, mover a otra columna escribe priority", () => {
    renderProximos([task({ id: "t1", title: "Tarea", priority: 4, due_date: "2026-08-05" })], [], [], {
      viewShape: "panel",
      groupBy: "prioridad",
    });

    lastBoardProps!.onMoveAcrossColumns("t1", "4", "1");

    expect(updateTaskMutate).toHaveBeenCalledWith({ id: "t1", projectId: "p1", patch: { priority: 1 } });
  });

  it("agrupado por fecha, mover a otra columna escribe due_date", () => {
    renderProximos([task({ id: "t1", title: "Tarea", due_date: "2026-08-05" })], [], [], {
      viewShape: "panel",
      groupBy: "fecha",
    });

    lastBoardProps!.onMoveAcrossColumns("t1", "2026-08-05", "2026-08-06");

    expect(updateTaskMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", projectId: "p1", patch: { due_date: "2026-08-06", due_at: null } }),
    );
  });

  it("agrupado por sección (tratada como 'nada' en Próximos, D-C), mover entre columnas escribe due_date, nunca section_id", () => {
    renderProximos(
      [task({ id: "t1", title: "Tarea de p1", project_id: "p1", section_id: null, due_date: "2026-08-05" })],
      [],
      allSections,
      { viewShape: "panel", groupBy: "seccion" },
    );

    lastBoardProps!.onMoveAcrossColumns("t1", "2026-08-05", "2026-08-06");

    expect(updateTaskMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", projectId: "p1", patch: { due_date: "2026-08-06", due_at: null } }),
    );
    expect(moveTaskMutate).not.toHaveBeenCalled();
  });
});

describe("ProximosView — reordenar dentro de una columna nunca persiste (D25, cruza proyectos)", () => {
  it("con orden manual, reordenar dentro de una columna igual no escribe nada", () => {
    renderProximos([task({ id: "t1", title: "Tarea", due_date: "2026-08-05" })], [], [], {
      viewShape: "panel",
      groupBy: "nada",
      order: "manual",
    });

    lastBoardProps!.onReorderWithinColumn("2026-08-05", "t1", 500);

    expect(moveTaskMutate).not.toHaveBeenCalled();
    expect(updateTaskMutate).not.toHaveBeenCalled();
  });
});

describe("ProximosView — tiempo planificado por día (capacidad carga-del-dia, D-B)", () => {
  it("cada día de la lista muestra su tiempo planificado junto al contador", () => {
    renderProximos(
      [
        task({ id: "t1", title: "Tarea", due_date: "2026-08-05", duration_minutes: 90 }),
        task({ id: "t2", title: "Otra tarea", due_date: "2026-08-05", duration_minutes: 60 }),
      ],
      [],
      [],
    );

    expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/2h 30m planificadas/)).toBeInTheDocument();
  });

  it("una tarea sin duración se informa aparte, no en silencio", () => {
    renderProximos(
      [
        task({ id: "t1", title: "Con duración", due_date: "2026-08-05", duration_minutes: 60 }),
        task({ id: "t2", title: "Sin duración", due_date: "2026-08-05", duration_minutes: null }),
      ],
      [],
      [],
    );

    expect(screen.getByText(/1h planificadas · 1 sin duración/)).toBeInTheDocument();
  });

  it("una tarea completada no suma, aunque 'mostrar completadas' esté activo", () => {
    renderProximos(
      [
        task({ id: "t1", title: "Pendiente", due_date: "2026-08-05", duration_minutes: 30 }),
        task({ id: "t2", title: "Completada", due_date: "2026-08-05", duration_minutes: 120, completed_at: "2026-08-05T10:00:00.000Z" }),
      ],
      [],
      [],
      { showCompleted: true },
    );

    expect(screen.getByText(/30m planificadas/)).toBeInTheDocument();
    expect(screen.queryByText(/2h 30m planificadas/)).not.toBeInTheDocument();
  });

  it("las atrasadas nunca entran en el tiempo planificado de un día (D-B): su lista agrupa por vencimiento, no por hoy", () => {
    renderProximos(
      [
        task({ id: "overdue", title: "Atrasada", due_date: "2026-08-01", duration_minutes: 300 }),
        task({ id: "today", title: "De hoy", due_date: "2026-08-05", duration_minutes: 30 }),
      ],
      [],
      [],
    );

    // El total de "Hoy" (el primer día de la ventana) es solo la tarea de
    // hoy: la atrasada nunca aparece en ningún grupo de día de Próximos.
    expect(screen.getByText(/30m planificadas/)).toBeInTheDocument();
    expect(screen.queryByText(/5h 30m planificadas/)).not.toBeInTheDocument();
  });
});
