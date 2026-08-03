// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import * as mediaQueryModule from "@/hooks/use-media-query";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { UndoProvider } from "@/components/providers/undo-provider";
import { TaskDetailPanel } from "./task-detail-panel";
import { TaskDetailProvider, useTaskDetail } from "./task-detail-context";
import type { TaskDetail } from "@/lib/tasks/use-task";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: vi.fn() }));

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
  defaultProjectId: null,
};

/** Mismo mock de `createClient()` que `task-detail-content.test.tsx`: acá también hace falta que `.single()`/`.maybeSingle()` devuelvan una fila. */
function createSupabaseMock() {
  const tableData: Record<string, unknown> = { tasks: [], labels: [] };

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
    update: vi.fn(() => ({ eq: vi.fn(() => chain({ error: null, data: null })) })),
    insert: vi.fn(() => chain({ data: null, error: null })),
    delete: vi.fn(() => chain({ data: null, error: null })),
  }));

  return { from, tableData };
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
  recurrence_anchor: null,
  labels: [],
};

/** Botón de prueba que abre el modal a través del mismo contexto que usa cualquier fila de tarea real (`useTaskDetail`). */
function OpenButton({ taskId, focusField }: { taskId: string; focusField?: "date" | "priority" | "title" }) {
  const { open } = useTaskDetail();
  return (
    <button type="button" onClick={() => open(taskId, focusField)}>
      Abrir tarea
    </button>
  );
}

function renderPanel(task: TaskDetail = baseTask, focusField?: "date" | "priority" | "title") {
  mock.tableData.tasks = [task];
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <UndoProvider>
          <TaskDetailProvider>
            <OpenButton taskId={task.id} focusField={focusField} />
            <TaskDetailPanel />
          </TaskDetailProvider>
        </UndoProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe("TaskDetailPanel — modal centrado en escritorio (bloque 6, D28)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mediaQueryModule.useMediaQuery as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  it("abre como diálogo modal (no como panel lateral) y el foco entra al modal", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Abrir tarea" }));

    const dialog = await screen.findByRole("dialog");
    expect(document.querySelector('[data-slot="dialog-content"]')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="sheet-content"]')).not.toBeInTheDocument();
    // Primer paso de la trampa de foco (igual que `dialog.test.tsx`): el
    // resto del ciclo de `Tab` se confirma a mano en el navegador, jsdom no
    // reproduce con fidelidad los guardias de foco de Base UI.
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it("Escape cierra el modal y devuelve el foco al botón que lo abrió", async () => {
    const user = userEvent.setup();
    renderPanel();

    const openButton = screen.getByRole("button", { name: "Abrir tarea" });
    await user.click(openButton);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.activeElement).toBe(openButton);
  });
});

describe("TaskDetailPanel — abre con un selector ya enfocado (bloque 7.8, atajos `T`/`Y`)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mediaQueryModule.useMediaQuery as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  // Regresión: `Y` abría el detalle pero el selector de Prioridad quedaba
  // cerrado (se veía "P4 · Baja" sin popover). El mecanismo es el mismo que
  // `T`/fecha (`open(taskId, focusField)` → `TaskDetailForm` consume
  // `pendingFocusField` al montar y clickea el trigger del selector), pero
  // fallaba solo con prioridad: el efecto que lo hace corría dos veces
  // (`consumeFocusField` cambia de identidad al llamarse) y el clic al
  // trigger de Base UI podía perderse si caía antes de que esa primitiva
  // terminara de conectar su propio manejo de clic. Este test cubre los dos
  // campos para no volver a dejar sin probar el que falla.
  it("Y: abre el detalle con el selector de prioridad ya desplegado", async () => {
    const user = userEvent.setup();
    renderPanel(baseTask, "priority");

    await user.click(screen.getByRole("button", { name: "Abrir tarea" }));
    await screen.findByRole("dialog");

    expect(await screen.findByRole("menuitem", { name: "P1 · Urgente" })).toBeInTheDocument();
  });

  it("T: abre el detalle con el selector de vencimiento ya desplegado", async () => {
    const user = userEvent.setup();
    renderPanel(baseTask, "date");

    await user.click(screen.getByRole("button", { name: "Abrir tarea" }));
    await screen.findByRole("dialog");

    expect(await screen.findByLabelText("Escribí la fecha de vencimiento")).toBeInTheDocument();
  });

  // D46 (reporte del dueño): "Abrir detalle" sin nada escrito crea la tarea
  // vacía igual y pide este mismo mecanismo (`open(taskId, "title")`) para
  // que el foco caiga en el título, no en la `X` de cerrar ni en ningún otro
  // control — el mismo cuidado de la carrera contra Base UI que ya cubren
  // los dos tests de acá arriba, pero enfocando el `<input>` en vez de
  // clickear un trigger.
  it('"title": abre el detalle con el foco ya en el título, para una tarea creada sin nada escrito', async () => {
    const user = userEvent.setup();
    renderPanel({ ...baseTask, title: "" }, "title");

    await user.click(screen.getByRole("button", { name: "Abrir tarea" }));
    await screen.findByRole("dialog");

    await waitFor(() => expect(screen.getByLabelText("Título de la tarea")).toHaveFocus());
  });
});

describe("TaskDetailPanel — pantalla completa en teléfono", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mediaQueryModule.useMediaQuery as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  it("en teléfono se muestra a pantalla completa, no como modal centrado", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Abrir tarea" }));

    await screen.findByRole("dialog");
    const sheetContent = document.querySelector('[data-slot="sheet-content"]');
    expect(sheetContent).toBeInTheDocument();
    expect(sheetContent).toHaveClass("w-full!");
    expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeInTheDocument();
  });
});
