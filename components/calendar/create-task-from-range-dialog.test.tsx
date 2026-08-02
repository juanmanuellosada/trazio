// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { CreateTaskFromRangeDialog } from "./create-task-from-range-dialog";

/**
 * Alta de tarea arrastrando en el calendario (`alta-de-tareas-en-contexto`,
 * D-F): pasó a usar `TaskQuickAddRow`, así que lo que importa probar acá es
 * lo que la implementación anterior no cumplía — una sola mutación con el
 * horario del rango, sin selector nativo — no el resto del composer, que ya
 * prueba `task-quick-add-row.test.tsx`.
 */

const PROJECTS = [
  {
    id: "inbox",
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
    color: "celeste",
    icon: null,
    description: null,
    parent_id: null,
    is_inbox: false,
    is_favorite: false,
    is_archived: false,
    position: 1,
  },
];

function chain(result: unknown) {
  const self: Record<string, unknown> = {
    eq: vi.fn(() => self),
    order: vi.fn(() => self),
    select: vi.fn(() => self),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: unknown) => void) => {
      setTimeout(() => resolve(result), 0);
    },
  };
  return self;
}

function dataFor(table: string): unknown {
  if (table === "projects") return PROJECTS;
  return [];
}

function createSupabaseMock() {
  const insertCalls: { table: string; payload: unknown }[] = [];
  const from = vi.fn((table: string) => ({
    select: vi.fn(() => chain({ data: dataFor(table), error: null })),
    insert: vi.fn((payload: unknown) => {
      insertCalls.push({ table, payload });
      if (table === "tasks") return chain({ data: { id: "new-task" }, error: null });
      return chain({ data: null, error: null });
    }),
  }));
  return { from, insertCalls };
}

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
const mock = createSupabaseMock();
(supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
  from: mock.from,
  auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } } }) },
}));

const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

function renderDialog(fixedProjectId: string | null) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={PREFERENCES}>
        <CreateTaskFromRangeDialog
          open
          onOpenChange={() => {}}
          range={{ start: new Date("2026-08-05T13:00:00.000Z"), end: new Date("2026-08-05T13:45:00.000Z") }}
          fixedProjectId={fixedProjectId}
        />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe("CreateTaskFromRangeDialog", () => {
  beforeEach(() => {
    mock.insertCalls.length = 0;
  });

  it("crea la tarea con el horario del rango en una sola mutación, sin encadenar un update", async () => {
    const user = userEvent.setup();
    renderDialog("inbox");

    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Escribir el informe");
    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    await waitFor(() => expect(mock.insertCalls.some((c) => c.table === "tasks")).toBe(true));
    const taskInserts = mock.insertCalls.filter((c) => c.table === "tasks");
    expect(taskInserts).toHaveLength(1); // una sola mutación (antes: crear + `useUpdateTask` encadenado)

    const task = taskInserts[0].payload as Record<string, unknown>;
    expect(task.due_at).toBe("2026-08-05T13:00:00.000Z");
    expect(task.duration_minutes).toBe(45);
    expect(task.project_id).toBe("inbox");
  });

  it("usa el selector de destino compartido, no uno nativo — y permite cambiar el proyecto sin `fixedProjectId`", async () => {
    const user = userEvent.setup();
    renderDialog(null); // Próximos: sin proyecto de contexto propio

    const destinationTrigger = await screen.findByRole("button", { name: "Proyecto destino" });
    await waitFor(() => expect(destinationTrigger).toHaveTextContent("Bandeja de entrada")); // sin `defaultProjectId`, cae en Bandeja

    await user.click(destinationTrigger);
    await user.click(await screen.findByRole("option", { name: "Trabajo" }));

    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Reunión");
    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    await waitFor(() => expect(mock.insertCalls.some((c) => c.table === "tasks")).toBe(true));
    const task = mock.insertCalls.find((c) => c.table === "tasks")!.payload as Record<string, unknown>;
    expect(task.project_id).toBe("p2");
  });
});
