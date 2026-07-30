// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { UndoProvider } from "@/components/providers/undo-provider";
import { ShortcutProvider } from "@/components/shortcuts/shortcut-provider";
import { TaskDetailContent } from "./task-detail-content";
import { TaskDetailProvider } from "./task-detail-context";
import { taskDetailQueryKey, type TaskDetail } from "@/lib/tasks/use-task";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/shortcuts/global-quick-add-dialog", () => ({ GlobalQuickAddDialog: () => null }));

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
};

/**
 * Mock de `createClient()` para el formulario de detalle (bloque 7.2/7.10):
 * a diferencia de `task-list.test.tsx`, acá hace falta que `.single()`/
 * `.maybeSingle()` devuelvan una fila, no el array crudo — se desenvuelve
 * acá para no repetir esa lógica en cada test.
 */
function createSupabaseMock() {
  const tableData: Record<string, unknown> = { tasks: [], labels: [] };
  const updateCalls: Array<{ table: string; patch: Record<string, unknown> }> = [];

  function unwrapSingle(result: { data: unknown; error: unknown }) {
    if (Array.isArray(result.data)) {
      return { data: result.data[0] ?? null, error: result.error };
    }
    return result;
  }

  function chain(result: { data: unknown; error: unknown }) {
    const self: Record<string, unknown> = {
      eq: vi.fn(() => self),
      order: vi.fn(() => self),
      in: vi.fn(() => self),
      single: vi.fn(() => chain(unwrapSingle(result))),
      maybeSingle: vi.fn(() => chain(unwrapSingle(result))),
      then: (resolve: (value: unknown) => void) => {
        setTimeout(() => resolve(result), 10);
      },
    };
    return self;
  }

  const from = vi.fn((table: string) => ({
    select: vi.fn(() => chain({ data: tableData[table] ?? [], error: null })),
    update: vi.fn((patch: Record<string, unknown>) => ({
      eq: vi.fn((column: string, value: unknown) => {
        updateCalls.push({ table, patch });
        if (column === "id") {
          const rows = tableData[table] as Array<Record<string, unknown>> | undefined;
          const index = (rows ?? []).findIndex((row) => row.id === value);
          if (index !== -1 && rows) rows[index] = { ...rows[index], ...patch };
        }
        return chain({ error: null, data: null });
      }),
    })),
    insert: vi.fn(() => chain({ data: null, error: null })),
    delete: vi.fn(() => chain({ data: null, error: null })),
  }));

  return { from, tableData, updateCalls };
}

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

const mock = createSupabaseMock();
(supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
  from: mock.from,
  auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } } }) },
  rpc: vi.fn().mockResolvedValue({ error: null }),
}));

const baseTask: TaskDetail = {
  id: "t1",
  project_id: "p1",
  section_id: null,
  parent_id: null,
  title: "Pagar el alquiler",
  description: null,
  priority: 4,
  due_date: null,
  due_at: null,
  duration_minutes: null,
  deadline: null,
  completed_at: null,
  created_at: "2026-01-01T00:00:00Z",
  position: 1000,
  recurrence_rule: null,
  recurrence_ends_at: null,
  recurrence_count: null,
  labels: [],
};

/**
 * Proyectos y secciones del selector del detalle (bloque 6): `p1` es la
 * Bandeja de entrada (`color: null`, `is_inbox: true`, el mismo criterio de
 * `resolveProjectColorHex` que la pinta con el azul de marca) y `p2` es un
 * proyecto normal con una sección, para probar que el selector arma
 * "Trabajo · En curso" igual que en el alta rápida.
 */
mock.tableData.projects = [
  {
    id: "p1",
    name: "Bandeja de entrada",
    color: null,
    icon: null,
    description: null,
    parent_id: null,
    is_inbox: true,
    is_favorite: false,
    is_archived: false,
    position: 0,
  },
  {
    id: "p2",
    name: "Trabajo",
    color: "azul",
    icon: null,
    description: null,
    parent_id: null,
    is_inbox: false,
    is_favorite: false,
    is_archived: false,
    position: 1,
  },
];
mock.tableData.sections = [{ id: "s1", project_id: "p2", name: "En curso" }];

function renderDetail(task: TaskDetail = baseTask) {
  mock.tableData.tasks = [task];
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <UndoProvider>
          <TaskDetailProvider>
            <TaskDetailContent taskId={task.id} initialData={task} />
          </TaskDetailProvider>
        </UndoProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
  return { queryClient };
}

/** Igual que `renderDetail`, con `<ShortcutProvider>` montado: para los tests de los atajos del detalle (bloque 7.6), que necesitan el único listener de `lib/shortcuts/`. */
function renderDetailWithShortcuts(task: TaskDetail = baseTask) {
  mock.tableData.tasks = [task];
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <UndoProvider>
          <TaskDetailProvider>
            <ShortcutProvider inboxProjectId={null}>
              <TaskDetailContent taskId={task.id} initialData={task} />
            </ShortcutProvider>
          </TaskDetailProvider>
        </UndoProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
  return { queryClient };
}

describe("TaskDetailContent — formulario de detalle (bloque 7.2/7.10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.updateCalls.length = 0;
  });

  it("autoguarda el título después de dejar de escribir", async () => {
    const user = userEvent.setup();
    renderDetail();

    const titleInput = screen.getByLabelText("Título de la tarea");
    await user.clear(titleInput);
    await user.type(titleInput, "Pagar el alquiler de agosto");

    await waitFor(
      () =>
        expect(mock.updateCalls.some((c) => c.table === "tasks" && c.patch.title === "Pagar el alquiler de agosto")).toBe(
          true,
        ),
      { timeout: 2000 },
    );
  });

  it("no autoguarda un título vacío: lo revierte al perder el foco", async () => {
    const user = userEvent.setup();
    renderDetail();

    const titleInput = screen.getByLabelText("Título de la tarea");
    await user.clear(titleInput);
    fireEvent.blur(titleInput);

    await waitFor(() => expect(titleInput).toHaveValue("Pagar el alquiler"));
    expect(mock.updateCalls.some((c) => "title" in c.patch)).toBe(false);
  });

  it("guarda la prioridad al instante al elegirla del selector", async () => {
    const user = userEvent.setup();
    renderDetail();

    await user.click(screen.getByRole("button", { name: /baja/i }));
    await user.click(await screen.findByRole("menuitem", { name: "P1 · Urgente" }));

    await waitFor(() =>
      expect(mock.updateCalls.some((c) => c.table === "tasks" && c.patch.priority === 1)).toBe(true),
    );
  });

  it("no pisa el título en edición cuando llega una actualización del servidor a mitad de la escritura (invalidación o Realtime)", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderDetail();

    const titleInput = screen.getByLabelText("Título de la tarea");
    await user.clear(titleInput);
    await user.type(titleInput, "Pagar el alquiler de");

    // Simula lo que dispararía un evento de Realtime o una invalidación de
    // query que llega mientras la persona todavía está escribiendo: el
    // caché se actualiza con un valor de servidor distinto al que se está
    // tipeando. El estado del título vive en `useState` sembrado una sola
    // vez (ver el comentario en `task-detail-content.tsx`), así que no debe
    // re-sincronizarse desde acá.
    queryClient.setQueryData(taskDetailQueryKey(baseTask.id), {
      ...baseTask,
      title: "Un título distinto que llegó del servidor",
    });

    expect(titleInput).toHaveValue("Pagar el alquiler de");

    await user.type(titleInput, " agosto");
    expect(titleInput).toHaveValue("Pagar el alquiler de agosto");

    await waitFor(
      () =>
        expect(
          mock.updateCalls.some((c) => c.table === "tasks" && c.patch.title === "Pagar el alquiler de agosto"),
        ).toBe(true),
      { timeout: 2000 },
    );
  });

  describe("selector de proyecto (bloque 6)", () => {
    // El trigger lleva `aria-label="Proyecto destino"` (fijo, de
    // `TaskDestinationSelect`), así que el nombre accesible del botón nunca
    // es el proyecto seleccionado — hay que buscarlo por ese aria-label y
    // revisar el texto visible aparte.
    async function findProjectTrigger() {
      return screen.findByRole("button", { name: "Proyecto destino" });
    }

    it("arranca precargado en el proyecto donde está la tarea, y la Bandeja de entrada se muestra bien", async () => {
      renderDetail(); // baseTask vive en "p1", la Bandeja de entrada

      // El trigger existe desde el primer render; su texto solo se actualiza
      // una vez que `useParserContext` termina de traer los proyectos.
      await waitFor(async () => expect(await findProjectTrigger()).toHaveTextContent("Bandeja de entrada"));
    });

    it("despliega los proyectos con sus secciones anidadas, Bandeja incluida", async () => {
      const user = userEvent.setup();
      renderDetail();

      await user.click(await findProjectTrigger());

      expect(await screen.findByRole("option", { name: "Bandeja de entrada" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Trabajo" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Trabajo · En curso" })).toBeInTheDocument();
    });

    it("la búsqueda filtra proyectos y secciones a la vez", async () => {
      const user = userEvent.setup();
      renderDetail();

      await user.click(await findProjectTrigger());
      await screen.findByRole("option", { name: "Trabajo" });

      await user.type(screen.getByPlaceholderText("Buscar proyecto o sección…"), "curso");

      expect(screen.getByRole("option", { name: "Trabajo · En curso" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Bandeja de entrada" })).not.toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Trabajo" })).not.toBeInTheDocument();
    });

    it("mover a una sección de otro proyecto deja la tarea y la sección coherentes", async () => {
      const user = userEvent.setup();
      renderDetail();

      await user.click(await findProjectTrigger());
      await user.click(await screen.findByRole("option", { name: "Trabajo · En curso" }));

      await waitFor(() =>
        expect(
          mock.updateCalls.some(
            (c) => c.table === "tasks" && c.patch.project_id === "p2" && c.patch.section_id === "s1",
          ),
        ).toBe(true),
      );
      // `parent_id` se resetea a null: mover desde este selector siempre deja
      // la tarea de primer nivel en el destino, el mismo achatamiento que ya
      // hace `MoveTaskDialog` con las subtareas.
      const call = mock.updateCalls.find((c) => c.table === "tasks" && c.patch.section_id === "s1");
      expect(call?.patch.parent_id).toBeNull();
    });
  });
});

describe("TaskDetailContent — atajos del detalle de tarea (bloque 7.6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.updateCalls.length = 0;
  });

  it("F abre el selector de prioridad", () => {
    renderDetailWithShortcuts();
    fireEvent.keyDown(window, { key: "f" });
    expect(screen.getByText("P1 · Urgente")).toBeInTheDocument();
  });

  it("D abre el selector de fecha de vencimiento", () => {
    renderDetailWithShortcuts();
    fireEvent.keyDown(window, { key: "d" });
    expect(screen.getByLabelText("Escribí la fecha de vencimiento")).toBeInTheDocument();
  });

  it("L abre el selector de fecha límite", () => {
    renderDetailWithShortcuts();
    fireEvent.keyDown(window, { key: "l" });
    // `DeadlineSelect` reutiliza el mismo `DatePickerBody` que `DateSelect`: el input de texto es el que distingue que se abrió éste y no otro popover.
    expect(screen.getAllByPlaceholderText("Ej: mañana, el martes, en 3 días…").length).toBeGreaterThan(0);
  });

  it("N agrega una subtarea nueva y vacía, lista para escribir su título", () => {
    renderDetailWithShortcuts();
    fireEvent.keyDown(window, { key: "n" });
    expect(screen.getByLabelText("Título de la nueva subtarea")).toBeInTheDocument();
  });

  it("Ctrl+S guarda de inmediato un título recién editado, sin esperar el debounce del autoguardado", async () => {
    const user = userEvent.setup();
    renderDetailWithShortcuts();

    const titleInput = screen.getByLabelText("Título de la tarea");
    await user.clear(titleInput);
    await user.type(titleInput, "Pagar el alquiler de agosto");
    // La guarda de foco (bloque 7.2) no tiene más excepción que `Ctrl/Cmd+Z`:
    // `Ctrl+S` tampoco se dispara con el foco todavía en el título, así que
    // el gesto real es sacar el foco de ahí y recién ahí guardar.
    titleInput.blur();

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() =>
      expect(mock.updateCalls.some((c) => c.table === "tasks" && c.patch.title === "Pagar el alquiler de agosto")).toBe(
        true,
      ),
    );
  });

  it("ningún atajo del detalle se dispara con el foco en el título, incluido Ctrl+S", () => {
    renderDetailWithShortcuts();
    const titleInput = screen.getByLabelText("Título de la tarea");
    titleInput.focus();
    fireEvent.keyDown(titleInput, { key: "f" });
    expect(screen.queryByText("P1 · Urgente")).not.toBeInTheDocument();

    fireEvent.keyDown(titleInput, { key: "s", ctrlKey: true });
    expect(mock.updateCalls.some((c) => c.table === "tasks" && "title" in c.patch)).toBe(false);
  });
});
