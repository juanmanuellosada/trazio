// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { TaskQuickAddRow } from "./task-quick-add-row";

/**
 * Tests de componente de R7 (bloque 9.23): la única regla del contrato sin
 * caso en la tabla porque es de interfaz, no de parsing (E10). Cubre el
 * resaltado en vivo, el doble clic que lo desactiva, y que al confirmar
 * los tokens todavía resaltados se quiten del título mientras los
 * desactivados queden como texto común.
 */

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
};

function chain(result: unknown) {
  const self: Record<string, unknown> = {
    eq: vi.fn(() => self),
    order: vi.fn(() => self),
    select: vi.fn(() => self),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: unknown) => void) => {
      setTimeout(() => resolve(result), 5);
    },
  };
  return self;
}

function createSupabaseMock() {
  const insertCalls: { table: string; payload: Record<string, unknown> }[] = [];

  const from = vi.fn((table: string) => ({
    select: vi.fn(() => chain({ data: [], error: null })),
    insert: vi.fn((payload: Record<string, unknown>) => {
      insertCalls.push({ table, payload });
      if (table === "tasks") return chain({ data: { id: "new-task" }, error: null });
      if (table === "labels") return chain({ data: { id: `label-${insertCalls.length}` }, error: null });
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

function renderRow() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <TaskQuickAddRow projectId="p1" sectionId={null} parentId={null} />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

function insertedTask() {
  return mock.insertCalls.find((c) => c.table === "tasks")?.payload;
}

describe("TaskQuickAddRow — resaltado en vivo y R7", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.insertCalls.length = 0;
  });

  it("resalta en vivo lo que el parser reconoce, con debounce", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Comprar pan mañana p1");

    await waitFor(() => {
      const marks = document.querySelectorAll("mark");
      expect(marks.length).toBe(2); // "mañana" y "p1"
    });
  });

  it("un doble clic sobre un resaltado lo desactiva: el token vuelve a texto común", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Comprar pan mañana p1");

    const mananaMark = await waitFor(() => {
      const mark = Array.from(document.querySelectorAll("mark")).find((m) => m.textContent === "mañana");
      if (!mark) throw new Error("todavía no se resaltó 'mañana'");
      return mark;
    });

    fireEvent.doubleClick(mananaMark);

    await waitFor(() => {
      const marks = Array.from(document.querySelectorAll("mark"));
      expect(marks.some((m) => m.textContent === "mañana")).toBe(false);
      expect(marks.some((m) => m.textContent === "p1")).toBe(true); // el otro sigue resaltado
    });
  });

  it("al confirmar, el token desactivado queda en el título y no genera su atributo; el resaltado activo se quita y sí genera el suyo", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Comprar pan mañana p1");

    const mananaMark = await waitFor(() => {
      const mark = Array.from(document.querySelectorAll("mark")).find((m) => m.textContent === "mañana");
      if (!mark) throw new Error("todavía no se resaltó 'mañana'");
      return mark;
    });
    fireEvent.doubleClick(mananaMark);

    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    const task = insertedTask()!;
    expect(task.title).toBe("Comprar pan mañana"); // "mañana" desactivado: queda en el título
    expect(task.due_date).toBeNull(); // ...y su atributo se descarta
    expect(task.priority).toBe(1); // "p1" nunca se desactivó: se quita del título y sí produce el atributo
  });

  it("confirmar sin desactivar nada quita del título todo lo reconocido", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Comprar pan mañana");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    const task = insertedTask()!;
    expect(task.title).toBe("Comprar pan");
    expect(task.due_date).not.toBeNull();
  });

  it("sin @, el destino es el proyecto donde vive el campo (bloque 9.24)", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar pan");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.project_id).toBe("p1");
  });

  it("crea la etiqueta desde # si no existe todavía y la asigna a la tarea (bloque 9.21, OQ1)", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar leche #compras");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.title).toBe("Comprar leche");

    const labelInsert = mock.insertCalls.find((c) => c.table === "labels");
    expect(labelInsert?.payload).toMatchObject({ name: "compras" });

    const taskLabelInsert = mock.insertCalls.find((c) => c.table === "task_labels");
    expect(taskLabelInsert).toBeDefined();
  });
});
