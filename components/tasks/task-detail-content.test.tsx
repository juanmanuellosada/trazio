// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { TaskDetailContent } from "./task-detail-content";
import type { TaskDetail } from "@/lib/tasks/use-task";

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

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
  labels: [],
};

function renderDetail(task: TaskDetail = baseTask) {
  mock.tableData.tasks = [task];
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <TaskDetailContent taskId={task.id} initialData={task} />
    </QueryClientProvider>,
  );
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
    await user.click(await screen.findByRole("menuitem", { name: "Urgente" }));

    await waitFor(() =>
      expect(mock.updateCalls.some((c) => c.table === "tasks" && c.patch.priority === 1)).toBe(true),
    );
  });
});
