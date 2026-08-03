// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { UndoProvider } from "@/components/providers/undo-provider";
import { TaskDetailProvider } from "@/components/tasks/task-detail-context";
import type { TaskRow } from "@/lib/tasks/use-tasks";
import { Board, type BoardColumn } from "./board";

/**
 * El tablero no tenía ni una prueba (proposal de
 * `openspec/changes/panel-con-columnas-por-campo/`, grupos 3, 4 y 6): estas
 * cubren lo que hay que conservar al reescribirlo (columnas, tareas,
 * arrastre habilitado/deshabilitado) y lo que se corrige de paso (el
 * marcado inválido de `<li>` anidados, tarea 6.1; el estado vacío sin guía,
 * tarea 6.2). El arrastre en sí —que la tarjeta siga al puntero fuera del
 * tablero (grupo 3)— no se prueba acá: se verifica en el navegador, de
 * verdad, como indica `tasks.md` 7.3.
 */

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/lib/projects/use-projects", () => ({ useProjects: () => ({ data: [] }) }));
vi.mock("@/lib/sections/use-sections", () => ({ useAllSections: () => ({ data: [] }), useSections: () => ({ data: [] }) }));

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
  defaultProjectId: null,
};

function chain(result: unknown) {
  const self: Record<string, unknown> = {
    eq: vi.fn(() => self),
    order: vi.fn(() => self),
    in: vi.fn(() => self),
    single: vi.fn(() => self),
    maybeSingle: vi.fn(() => self),
    then: (resolve: (value: unknown) => void) => resolve(result),
  };
  return self;
}

function stubSupabaseClient() {
  const from = vi.fn(() => ({
    select: vi.fn(() => chain({ data: [], error: null })),
    update: vi.fn(() => ({ eq: vi.fn(() => chain({ error: null })), in: vi.fn(() => chain({ error: null })) })),
    insert: vi.fn(() => chain({ data: null, error: null })),
    delete: vi.fn(() => chain({ error: null })),
  }));
  return {
    from,
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } } }) },
    rpc: vi.fn().mockResolvedValue({ error: null }),
  };
}

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

function renderBoard(columns: BoardColumn[], draggable: boolean, extraProps: Partial<ComponentProps<typeof Board>> = {}) {
  const queryClient = new QueryClient();
  const onReorderWithinColumn = vi.fn();
  const onMoveAcrossColumns = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <UndoProvider>
          <TaskDetailProvider>
            <Board
              columns={columns}
              allTasks={columns.flatMap((c) => c.tasks)}
              draggable={draggable}
              onReorderWithinColumn={onReorderWithinColumn}
              onMoveAcrossColumns={onMoveAcrossColumns}
              {...extraProps}
            />
          </TaskDetailProvider>
        </UndoProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
  return { onReorderWithinColumn, onMoveAcrossColumns };
}

describe("Board — columnas y tareas", () => {
  beforeEach(async () => {
    const supabaseClientModule = await import("@/lib/supabase/client");
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(stubSupabaseClient);
  });

  it("dibuja cada columna con su título y la cantidad de tareas", () => {
    const columns: BoardColumn[] = [
      { id: "col-a", title: "Sin sección", tasks: [task({ id: "t1", title: "Pagar el alquiler" })] },
      { id: "col-b", title: "Trabajo", tasks: [] },
    ];
    renderBoard(columns, true);

    expect(screen.getByText("Sin sección")).toBeInTheDocument();
    expect(screen.getByText("Trabajo")).toBeInTheDocument();
    expect(screen.getByText("Pagar el alquiler")).toBeInTheDocument();
    // Contador de tareas por columna.
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("respeta el orden de las tareas dentro de cada columna", () => {
    const columns: BoardColumn[] = [
      {
        id: "col-a",
        title: "A",
        tasks: [task({ id: "t1", title: "Primera" }), task({ id: "t2", title: "Segunda" })],
      },
    ];
    renderBoard(columns, true);

    const titles = screen.getAllByText(/Primera|Segunda/).map((el) => el.textContent);
    expect(titles).toEqual(["Primera", "Segunda"]);
  });

  it("con `draggable=true` cada tarjeta muestra su manija de arrastre", () => {
    const columns: BoardColumn[] = [{ id: "col-a", title: "A", tasks: [task({ id: "t1", title: "Tarea" })] }];
    renderBoard(columns, true);

    expect(screen.getByRole("button", { name: "Reordenar Tarea" })).toBeInTheDocument();
  });

  it("con `draggable=false` no hay manija de arrastre", () => {
    const columns: BoardColumn[] = [{ id: "col-a", title: "A", tasks: [task({ id: "t1", title: "Tarea" })] }];
    renderBoard(columns, false);

    expect(screen.queryByRole("button", { name: "Reordenar Tarea" })).not.toBeInTheDocument();
  });
});

describe("Board — marcado válido (tarea 6.1, defecto de hidratación conocido)", () => {
  beforeEach(async () => {
    const supabaseClientModule = await import("@/lib/supabase/client");
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(stubSupabaseClient);
  });

  it("cada tarea es un único <li>, no dos anidados", () => {
    const columns: BoardColumn[] = [{ id: "col-a", title: "A", tasks: [task({ id: "t1", title: "Tarea" })] }];
    renderBoard(columns, true);

    const list = screen.getByText("Tarea").closest("ul")!;
    const items = within(list).getAllByRole("listitem");
    // Un solo <li> para la tarea (antes: el tablero envolvía la fila en un
    // <li> propio, y la fila ya devuelve el suyo — dos anidados, inválido).
    expect(items).toHaveLength(1);
    expect(items[0].querySelector("li")).toBeNull();
  });
});

describe("Board — columna vacía (tarea 6.2, `.claude/rules/copy.md` \"Vacíos\")", () => {
  beforeEach(async () => {
    const supabaseClientModule = await import("@/lib/supabase/client");
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(stubSupabaseClient);
  });

  it("ya no dice \"Sin tareas.\": explica qué va a aparecer ahí", () => {
    const columns: BoardColumn[] = [{ id: "col-a", title: "Vacía", tasks: [] }];
    renderBoard(columns, true);

    expect(screen.queryByText("Sin tareas.")).not.toBeInTheDocument();
  });

  it("deja el hueco para la acción de agregar (grupo 5, otra tanda)", () => {
    const columns: BoardColumn[] = [{ id: "col-a", title: "Vacía", tasks: [] }];
    renderBoard(columns, true, {
      renderColumnEmptyAction: (column) => <button type="button">{`Agregar a ${column.title}`}</button>,
    });

    expect(screen.getByRole("button", { name: "Agregar a Vacía" })).toBeInTheDocument();
  });
});

describe("Board — la tarjeta muestra dos líneas de título (tarea 4.1)", () => {
  beforeEach(async () => {
    const supabaseClientModule = await import("@/lib/supabase/client");
    (supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(stubSupabaseClient);
  });

  it("el título no trunca a una sola línea", () => {
    const longTitle = "Un título bastante largo que antes se cortaba a las dieciséis letras";
    const columns: BoardColumn[] = [{ id: "col-a", title: "A", tasks: [task({ id: "t1", title: longTitle })] }];
    renderBoard(columns, true);

    const titleSpan = screen.getByText(longTitle);
    expect(titleSpan.className).not.toContain("truncate");
    expect(titleSpan.className).toContain("line-clamp-2");
  });
});
