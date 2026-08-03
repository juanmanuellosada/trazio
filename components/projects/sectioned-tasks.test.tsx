// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { ComposeContextProvider } from "@/components/tasks/compose-context";
import { TaskDetailProvider } from "@/components/tasks/task-detail-context";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import type { SectionRow } from "@/lib/sections/use-sections";
import { defaultOptionsForViewKey, type ViewOptions } from "@/lib/view-options/schema";
import type { BoardColumn } from "@/components/board/board";
import { SectionedTasks } from "./sectioned-tasks";

/**
 * Hueco 7.2 de `openspec/changes/panel-con-columnas-por-campo/tasks.md`:
 * `SectionedTasks` (Bandeja y Proyecto) monta el panel armando columnas a
 * partir de `options.groupBy`, pero no tenía ninguna prueba propia — se
 * había verificado a mano en el navegador. Estas cubren el cableado: qué
 * columnas arma cada agrupador, y qué escribe mover una tarjeta entre
 * columnas — no el arrastre en sí (`Board` ya lo prueba, `board.test.tsx`,
 * y el navegador lo verifica de verdad, `tasks.md` 7.3).
 *
 * `Board` se mockea (igual criterio que las pruebas de pantalla que ya
 * mockean sus piezas pesadas): expone `columns` y los dos manejadores tal
 * cual los recibe, para invocarlos directo sin simular un arrastre real de
 * `@dnd-kit` (que no funciona sobre jsdom).
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
let currentOptions: ViewOptions;
vi.mock("@/lib/view-options/use-view-options", () => ({
  useViewOptions: (_viewKey: string, initialOptions: unknown) => ({ options: currentOptions ?? initialOptions }),
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/lib/projects/use-projects", () => ({ useProjects: () => ({ data: [] }) }));
// `AddSectionRow` (montado en el panel cuando las columnas son secciones)
// llama `createClient()` al renderizar, no solo al enviar el formulario
// (`useCreateSection`, `lib/sections/mutations.ts`): sin este mock,
// `createBrowserClient` revienta por faltar las variables de entorno.
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ auth: { getSession: vi.fn() }, from: vi.fn() }) }));

const updateTaskMutate = vi.fn();
const moveTaskMutate = vi.fn();
vi.mock("@/lib/tasks/mutations", () => ({
  useUpdateTask: () => ({ mutate: updateTaskMutate }),
  useMoveTask: () => ({ mutate: moveTaskMutate }),
}));

let currentSections: SectionRow[] = [];
let currentTasks: TaskRow[] = [];
vi.mock("@/lib/sections/use-sections", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sections/use-sections")>();
  return { ...actual, useSections: () => ({ data: currentSections }) };
});
vi.mock("@/lib/tasks/use-tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tasks/use-tasks")>();
  return { ...actual, useTasks: () => ({ data: currentTasks }) };
});

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

function renderSectioned(
  tasks: TaskRow[],
  sections: SectionRow[],
  optionsOverride: Partial<ViewOptions> = {},
  viewKey = "proyecto:p1",
) {
  currentTasks = tasks;
  currentSections = sections;
  lastBoardProps = null;
  const initialOptions = { ...defaultOptionsForViewKey(viewKey), ...optionsOverride };
  currentOptions = initialOptions;
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <TaskDetailProvider>
          <ComposeContextProvider>
            <SectionedTasks
              projectId="p1"
              viewKey={viewKey}
              initialOptions={initialOptions}
              timezone="America/Argentina/Buenos_Aires"
              initialSections={sections}
              initialTasks={tasks}
              emptyState={<div>Vacío</div>}
            />
          </ComposeContextProvider>
        </TaskDetailProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  updateTaskMutate.mockClear();
  moveTaskMutate.mockClear();
});

const sections: SectionRow[] = [
  { id: "s1", project_id: "p1", name: "Por hacer", description: null, position: 1000, is_collapsed: false },
  { id: "s2", project_id: "p1", name: "Hecho", description: null, position: 2000, is_collapsed: false },
];

describe("SectionedTasks — panel, 'nada' es lo natural de Proyecto (D-A)", () => {
  it("agrupando por 'nada', las columnas son las secciones del proyecto más 'Sin sección'", () => {
    renderSectioned(
      [task({ id: "t1", title: "Tarea sin sección" }), task({ id: "t2", title: "Tarea en Por hacer", section_id: "s1" })],
      sections,
      { viewShape: "panel", groupBy: "nada" },
    );

    const titles = lastBoardProps!.columns.map((c) => c.title);
    expect(titles).toEqual(["Sin sección", "Por hacer", "Hecho"]);
  });

  it("también es Bandeja (viewKey 'bandeja'): mismo cableado, no se asume solo por ser el mismo componente", () => {
    renderSectioned(
      [task({ id: "t1", title: "Tarea de bandeja" })],
      sections,
      { viewShape: "panel", groupBy: "nada" },
      "bandeja",
    );

    const titles = lastBoardProps!.columns.map((c) => c.title);
    expect(titles).toEqual(["Sin sección", "Por hacer", "Hecho"]);
  });
});

describe("SectionedTasks — cambiar el agrupador cambia las columnas", () => {
  it("'sección' produce las mismas columnas que 'nada'", () => {
    renderSectioned([task({ id: "t1", title: "Tarea" })], sections, { viewShape: "panel", groupBy: "seccion" });
    expect(lastBoardProps!.columns.map((c) => c.title)).toEqual(["Sin sección", "Por hacer", "Hecho"]);
  });

  it("'prioridad' produce las cuatro columnas fijas, no las secciones", () => {
    renderSectioned([task({ id: "t1", title: "Tarea", priority: 1 })], sections, {
      viewShape: "panel",
      groupBy: "prioridad",
    });
    expect(lastBoardProps!.columns.map((c) => c.title)).toEqual(["Urgente", "Alta", "Media", "Baja"]);
  });

  it("'fecha' produce columnas por día de vencimiento, más 'Sin fecha'", () => {
    renderSectioned(
      [task({ id: "t1", title: "Tarea con fecha", due_date: "2026-08-10" }), task({ id: "t2", title: "Sin fecha" })],
      sections,
      { viewShape: "panel", groupBy: "fecha" },
    );
    const titles = lastBoardProps!.columns.map((c) => c.title);
    expect(titles).toHaveLength(2);
    expect(titles[titles.length - 1]).toBe("Sin fecha");
  });
});

describe("SectionedTasks — mover entre columnas escribe el campo correcto (D-C)", () => {
  it("agrupado por sección, mover a otra columna escribe section_id y la posición, dentro del mismo proyecto", () => {
    renderSectioned(
      [task({ id: "t1", title: "Tarea", section_id: null })],
      sections,
      { viewShape: "panel", groupBy: "seccion" },
    );

    lastBoardProps!.onMoveAcrossColumns("t1", "sin-seccion", "s1");

    expect(moveTaskMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "t1",
        fromProjectId: "p1",
        toProjectId: "p1",
        sectionId: "s1",
        parentId: null,
      }),
    );
  });

  it("agrupado por prioridad, mover a otra columna escribe priority", () => {
    renderSectioned([task({ id: "t1", title: "Tarea", priority: 4 })], sections, {
      viewShape: "panel",
      groupBy: "prioridad",
    });

    lastBoardProps!.onMoveAcrossColumns("t1", "4", "1");

    expect(updateTaskMutate).toHaveBeenCalledWith({ id: "t1", projectId: "p1", patch: { priority: 1 } });
  });

  it("agrupado por fecha, mover a otra columna escribe due_date", () => {
    renderSectioned([task({ id: "t1", title: "Tarea", due_date: "2026-08-10" })], sections, {
      viewShape: "panel",
      groupBy: "fecha",
    });

    lastBoardProps!.onMoveAcrossColumns("t1", "2026-08-10", "2026-08-15");

    expect(updateTaskMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", projectId: "p1", patch: { due_date: "2026-08-15", due_at: null } }),
    );
  });
});

describe("SectionedTasks — reordenar dentro de una columna solo persiste con orden manual (tarea 2.5)", () => {
  it("con orden 'fecha' (no manual), reordenar dentro de la columna no escribe nada", () => {
    renderSectioned([task({ id: "t1", title: "Tarea", section_id: "s1" })], sections, {
      viewShape: "panel",
      groupBy: "seccion",
      order: "fecha",
    });

    lastBoardProps!.onReorderWithinColumn("s1", "t1", 500);

    expect(moveTaskMutate).not.toHaveBeenCalled();
  });

  it("con orden manual, reordenar dentro de la columna sí escribe la posición", () => {
    renderSectioned([task({ id: "t1", title: "Tarea", section_id: "s1" })], sections, {
      viewShape: "panel",
      groupBy: "seccion",
      order: "manual",
    });

    lastBoardProps!.onReorderWithinColumn("s1", "t1", 500);

    expect(moveTaskMutate).toHaveBeenCalledWith({
      id: "t1",
      fromProjectId: "p1",
      toProjectId: "p1",
      sectionId: "s1",
      parentId: null,
      position: 500,
    });
  });
});
