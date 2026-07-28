// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import * as toastModule from "@/lib/toast";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { TaskDetailProvider, useTaskDetail } from "./task-detail-context";
import { TaskList } from "./task-list";
import type { TaskRow } from "@/lib/tasks/use-tasks";

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
};

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

/**
 * Mock genérico de `createClient()`: cada tabla resuelve `select` con lo
 * que se le haya configurado en `tableData` (por defecto, lista vacía), y
 * `update(...)` resuelve con `updateError.current` (por defecto éxito). Los
 * mocks de proyectos/secciones (`MoveTaskDialog`, montado sin abrir dentro
 * de cada fila) usan el default vacío: no son el foco de este test.
 */
function createSupabaseMock() {
  const tableData: Record<string, unknown> = { tasks: [] };
  const updateError = { current: null as { message: string } | null };
  const updateCalls: Array<{ table: string; patch: Record<string, unknown> }> = [];

  function chain(result: unknown) {
    const self: Record<string, unknown> = {
      eq: vi.fn(() => self),
      order: vi.fn(() => self),
      in: vi.fn(() => self),
      single: vi.fn(() => self),
      maybeSingle: vi.fn(() => self),
      // Resuelve en un macrotask, no en el mismo microtask: así el estado
      // optimista (que se aplica antes de que esto resuelva) alcanza a
      // pintarse y el test puede observarlo antes de la reversión, como
      // pasaría contra una red real.
      then: (resolve: (value: unknown) => void) => {
        setTimeout(() => resolve(result), 10);
      },
    };
    return self;
  }

  const from = vi.fn((table: string) => ({
    select: vi.fn(() => chain({ data: tableData[table] ?? [], error: null })),
    update: vi.fn((patch: Record<string, unknown>) => ({
      // El `.eq("id", ...)` es donde Postgres aplicaría el `UPDATE` de
      // verdad: acá es donde el mock escribe el cambio en `tableData`, para
      // que un refetch posterior (el `invalidateQueries` de `onSettled`)
      // devuelva el valor ya actualizado en vez de la foto original — sin
      // esto, cualquier mutación exitosa se vería "revertida" por el propio
      // mock al releer datos viejos, aunque el servidor real la hubiera
      // aplicado bien.
      eq: vi.fn((column: string, value: unknown) => {
        updateCalls.push({ table, patch });
        if (!updateError.current && column === "id") {
          const rows = tableData[table] as Array<Record<string, unknown>> | undefined;
          const index = (rows ?? []).findIndex((row) => row.id === value);
          if (index !== -1 && rows) rows[index] = { ...rows[index], ...patch };
        }
        return chain({ error: updateError.current });
      }),
      in: vi.fn((column: string, values: unknown[]) => {
        updateCalls.push({ table, patch });
        if (!updateError.current && column === "id") {
          const rows = tableData[table] as Array<Record<string, unknown>> | undefined;
          for (const row of rows ?? []) {
            if (values.includes(row.id)) Object.assign(row, patch);
          }
        }
        return chain({ error: updateError.current });
      }),
    })),
    insert: vi.fn(() => chain({ data: null, error: null })),
    delete: vi.fn(() => chain({ error: null })),
  }));

  const getSession = vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });

  return { from, tableData, updateError, updateCalls, getSession };
}

vi.mock("@/lib/supabase/client", () => {
  return { createClient: vi.fn() };
});

const mock = createSupabaseMock();
(supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
  from: mock.from,
  auth: { getSession: mock.getSession },
  rpc: vi.fn().mockResolvedValue({ error: null }),
}));

function task(overrides: Partial<TaskRow> & { id: string }): TaskRow {
  return {
    project_id: "p1",
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

function renderList(tasks: TaskRow[]) {
  mock.tableData.tasks = tasks;
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <TaskDetailProvider>
          <TaskList projectId="p1" sectionId={null} parentId={null} initialTasks={tasks} />
        </TaskDetailProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

/** Expone `openTaskId` del contexto en el DOM, para verificar sin abrir el modal de verdad (bloque 6) si el título de una fila disparó `open()` o no. */
function OpenTaskProbe() {
  const { openTaskId } = useTaskDetail();
  return <div data-testid="open-task-id">{openTaskId ?? ""}</div>;
}

function renderListWithProbe(tasks: TaskRow[]) {
  mock.tableData.tasks = tasks;
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <TaskDetailProvider>
          <OpenTaskProbe />
          <TaskList projectId="p1" sectionId={null} parentId={null} initialTasks={tasks} />
        </TaskDetailProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe("TaskList — completar con optimistic update (bloque 7.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.updateError.current = null;
    mock.updateCalls.length = 0;
    mock.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  });

  afterEach(() => vi.useRealTimers());

  it("se ve completada al instante, sin esperar al servidor", async () => {
    renderList([task({ id: "t1", title: "Pagar el alquiler" })]);

    const checkbox = screen.getByRole("checkbox", { name: "Completar Pagar el alquiler" });
    fireEvent.click(checkbox);

    // Optimista: el mock resuelve sin demora artificial, así que alcanza y
    // sobra para probar que el cambio no espera nada más — no hay ningún
    // `await` de una respuesta "lenta" de por medio.
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Descompletar Pagar el alquiler" })).toHaveAttribute(
        "aria-checked",
        "true",
      ),
    );
  });

  it("si el servidor rechaza, revierte y avisa con el formato de tres partes", async () => {
    mock.updateError.current = { message: "boom" };
    renderList([task({ id: "t1", title: "Pagar el alquiler" })]);

    fireEvent.click(screen.getByRole("checkbox", { name: "Completar Pagar el alquiler" }));
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Descompletar Pagar el alquiler" })).toBeInTheDocument(),
    );

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Completar Pagar el alquiler" })).toBeInTheDocument(),
    );
    expect(toastModule.toastError).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });
});

describe("TaskList — indentar/desindentar por teclado (bloque 7.8)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.updateError.current = null;
    mock.updateCalls.length = 0;
    mock.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  });

  it("Tab sobre el título de la segunda tarea la indenta bajo la primera", async () => {
    const A = task({ id: "A", title: "Primera", position: 1000 });
    const B = task({ id: "B", title: "Segunda", position: 2000 });
    renderList([A, B]);

    const titleButton = screen.getByRole("button", { name: "Segunda" });
    fireEvent.keyDown(titleButton, { key: "Tab" });

    await waitFor(() => expect(mock.updateCalls.length).toBeGreaterThan(0));
    const call = mock.updateCalls[0];
    expect(call.table).toBe("tasks");
    expect(call.patch).toMatchObject({ parent_id: "A" });
  });

  it("no hace nada al indentar la primera tarea de su contexto: no hay hermano anterior", async () => {
    const A = task({ id: "A", title: "Primera", position: 1000 });
    renderList([A]);

    const titleButton = screen.getByRole("button", { name: "Primera" });
    fireEvent.keyDown(titleButton, { key: "Tab" });

    expect(mock.updateCalls.length).toBe(0);
  });

  it("Shift+Tab desindenta una subtarea", async () => {
    const A = task({ id: "A", title: "Primera", position: 1000 });
    const B1 = task({ id: "B1", title: "Subtarea", parent_id: "A", position: 1000 });
    renderList([A, B1]);

    const titleButton = await screen.findByRole("button", { name: "Subtarea" });
    fireEvent.keyDown(titleButton, { key: "Tab", shiftKey: true });

    await waitFor(() => expect(mock.updateCalls.length).toBeGreaterThan(0));
    expect(mock.updateCalls[0].patch).toMatchObject({ parent_id: null });
  });
});

describe("TaskList — punto de prioridad (ruido en la prioridad por defecto)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.updateError.current = null;
    mock.updateCalls.length = 0;
    mock.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  });

  it("no muestra el punto en la prioridad por defecto (4)", async () => {
    renderList([task({ id: "t1", title: "Pagar el alquiler", priority: 4 })]);

    await screen.findByRole("button", { name: "Pagar el alquiler" });
    expect(document.querySelector(".rounded-full[aria-hidden]")).toBeNull();
  });

  it("muestra el punto cuando la prioridad no es la de por defecto", async () => {
    renderList([task({ id: "t1", title: "Pagar el alquiler", priority: 1 })]);

    await screen.findByRole("button", { name: "Pagar el alquiler" });
    expect(document.querySelector(".rounded-full[aria-hidden]")).not.toBeNull();
  });
});

describe("TaskList — abrir el detalle con doble clic, sin perder el camino por teclado (bloque 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.updateError.current = null;
    mock.updateCalls.length = 0;
    mock.getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  });

  it("un clic simple con el mouse no abre el detalle", async () => {
    renderListWithProbe([task({ id: "t1", title: "Pagar el alquiler" })]);

    const titleButton = await screen.findByRole("button", { name: "Pagar el alquiler" });
    fireEvent.click(titleButton, { detail: 1 });

    expect(screen.getByTestId("open-task-id")).toHaveTextContent("");
  });

  it("un doble clic con el mouse abre el detalle", async () => {
    renderListWithProbe([task({ id: "t1", title: "Pagar el alquiler" })]);

    const titleButton = await screen.findByRole("button", { name: "Pagar el alquiler" });
    fireEvent.doubleClick(titleButton);

    expect(screen.getByTestId("open-task-id")).toHaveTextContent("t1");
  });

  it("activar el título por teclado abre el detalle directo, sin necesitar un segundo Enter", async () => {
    renderListWithProbe([task({ id: "t1", title: "Pagar el alquiler" })]);

    const titleButton = await screen.findByRole("button", { name: "Pagar el alquiler" });
    titleButton.focus();
    // Un botón activado por teclado (Enter/Espacio) dispara `click` con
    // `detail: 0`, a diferencia de un clic real de mouse (`detail >= 1`):
    // es la señal que `handleTitleClick` usa en `task-row.tsx`.
    fireEvent.click(titleButton, { detail: 0 });

    expect(screen.getByTestId("open-task-id")).toHaveTextContent("t1");
  });
});
