// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { TaskQuickAddRow } from "./task-quick-add-row";

/**
 * Tests del componente de alta (bloque 5.12, con las dos superficies del
 * bloque 7 y el contexto/plegado de `alta-de-tareas-en-contexto`): además de
 * R7 (resaltado en vivo y doble clic), cubre que los selectores carguen su
 * atributo, que un selector tocado a mano le gane al parser, que cancelar no
 * persista nada, que se pueda cargar más de una tarea seguida sin tocar el
 * mouse, que todos los controles del alta sean alcanzables solo con teclado,
 * que el destino se vea en las dos superficies (D-D), que `full` arranque
 * plegado y se despliegue (D-C), y que etiquetas y recordatorios se ofrezcan
 * en las dos (D-E).
 */

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
  defaultProjectId: null,
};

// Dos proyectos (bloque 5.4): "p1" es el contexto por defecto donde vive el
// campo en todos los tests de acá (`renderRow` siempre lo usa como
// `projectId`); "p2" existe solo para poder elegir un destino distinto desde
// el selector y comprobar que ese es el que se respeta al confirmar.
const PROJECTS = [
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

// Una sección de "Trabajo" (p2) y dos etiquetas existentes, para poder abrir
// el menú de `#`/`@` (bloque 3) y ver algo más que la lista vacía. Ninguno
// de estos nombres coincide con lo que tipean los demás tests de este
// archivo (por ejemplo "compras", que otro test espera que el parser cree
// recién al confirmar) para no pisar esos casos.
const SECTIONS = [{ id: "sec1", project_id: "p2", name: "En curso" }];
const LABELS = [
  { id: "l1", name: "casa", color: "celeste" },
  { id: "l2", name: "personal", color: "rojo" },
];

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

function dataFor(table: string): unknown {
  if (table === "projects") return PROJECTS;
  if (table === "sections") return SECTIONS;
  if (table === "labels") return LABELS;
  return [];
}

function createSupabaseMock() {
  const insertCalls: { table: string; payload: Record<string, unknown> | Record<string, unknown>[] }[] = [];

  const from = vi.fn((table: string) => ({
    select: vi.fn(() => chain({ data: dataFor(table), error: null })),
    insert: vi.fn((payload: Record<string, unknown> | Record<string, unknown>[]) => {
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

function renderRow(overrides: Partial<ComponentProps<typeof TaskQuickAddRow>> = {}) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <TaskQuickAddRow projectId="p1" sectionId={null} parentId={null} {...overrides} />
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

function insertedTask() {
  return mock.insertCalls.find((c) => c.table === "tasks")?.payload as Record<string, unknown> | undefined;
}

/** Recordatorios insertados (`alta-de-tareas-en-contexto`, D-E): siempre un array, un insert por tarea creada. */
function insertedReminders() {
  return (mock.insertCalls.find((c) => c.table === "reminders")?.payload ?? []) as Record<string, unknown>[];
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

  it("sin #, el destino es el proyecto donde vive el campo (bloque 9.24)", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar pan");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.project_id).toBe("p1");
  });

  it("crea la etiqueta desde @ si no existe todavía y la asigna a la tarea (bloque 9.21, OQ1)", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    // Espacio final: cierra el token (bloque 3) antes del Enter, para que
    // ese Enter someta la tarea y no confirme la opción del menú de @ que
    // "compras" (sin coincidencias) también ofrece mientras el token sigue
    // abierto — ese camino ya tiene su propio test en el bloque de abajo.
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar leche @compras ");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.title).toBe("Comprar leche");

    const labelInsert = mock.insertCalls.find((c) => c.table === "labels");
    expect(labelInsert?.payload).toMatchObject({ name: "compras" });

    const taskLabelInsert = mock.insertCalls.find((c) => c.table === "task_labels");
    expect(taskLabelInsert).toBeDefined();
  });
});

describe("TaskQuickAddRow — componente de alta rico (bloque 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.insertCalls.length = 0;
  });

  it("el selector de prioridad carga su atributo sin necesidad de escribirlo en el título", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar pan");

    await user.click(screen.getByRole("button", { name: "P4 · Baja" })); // default (4)
    await user.click(await screen.findByRole("menuitem", { name: /Urgente/ }));

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.priority).toBe(1);
  });

  it("el selector de prioridad, tocado a mano, le gana a lo que el parser reconoce en el título (criterio de desempate)", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    // "p1" en el título pide Urgente (1): si el selector no ganara, la
    // tarea se crearía con prioridad 1 en vez de la elegida a mano. La vista
    // previa del selector ya muestra "Urgente" en cuanto el parser lo
    // reconoce (antes de tocarlo) — se espera esa actualización primero.
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar pan p1");
    const priorityTrigger = await screen.findByRole("button", { name: "P1 · Urgente" });

    await user.click(priorityTrigger);
    await user.click(await screen.findByRole("menuitem", { name: "P4 · Baja" })); // elegir explícitamente Baja: le gana al "p1" del título

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.priority).toBe(4); // el selector explícito, no el "p1" del título
  });

  it("en variant=\"full\", el destino muestra el proyecto de contexto por defecto y respeta el que se elija a mano", async () => {
    const user = userEvent.setup();
    renderRow({ variant: "full" });
    const destinationTrigger = screen.getByRole("button", { name: "Proyecto destino" });
    // `proyectos` tarda en resolver (mock async): espera a que el destino
    // por defecto se pinte antes de leerlo, en vez de asumirlo ya listo en
    // el primer render.
    await waitFor(() => expect(destinationTrigger).toHaveTextContent("Bandeja de entrada")); // "p1", visible antes de confirmar

    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar pan");
    await user.click(destinationTrigger);
    await user.click(await screen.findByRole("option", { name: "Trabajo" }));
    expect(destinationTrigger).toHaveTextContent("Trabajo");

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.project_id).toBe("p2");
  });

  it("cancelar no crea la tarea y descarta lo escrito", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Algo que no debería guardarse");
    await user.type(screen.getByLabelText("Descripción de la nueva tarea"), "Tampoco esto");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(mock.insertCalls.find((c) => c.table === "tasks")).toBeUndefined();
    expect(screen.queryByLabelText("Título de la nueva tarea")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar tarea" })).toBeInTheDocument();
  });

  it("después de confirmar, el foco vuelve al título: se pueden cargar varias tareas seguidas sin tocar el mouse", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Primera tarea");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(mock.insertCalls.filter((c) => c.table === "tasks")).toHaveLength(1));

    expect(input).toHaveFocus();

    await user.keyboard("Segunda tarea{Enter}");
    await waitFor(() => expect(mock.insertCalls.filter((c) => c.table === "tasks")).toHaveLength(2));
    const tasks = mock.insertCalls.filter((c) => c.table === "tasks").map((c) => c.payload as Record<string, unknown>);
    expect(tasks[0].title).toBe("Primera tarea");
    expect(tasks[1].title).toBe("Segunda tarea");
  });

  it("en compact, todos los controles del alta —incluido el destino, etiquetas y recordatorios— son alcanzables con Tab, en el orden esperado (D-D/D-E)", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    const title = screen.getByLabelText("Título de la nueva tarea");
    const destinationTrigger = await screen.findByRole("button", { name: "Proyecto destino" });
    const description = screen.getByLabelText("Descripción de la nueva tarea");
    const dateTrigger = screen.getByRole("button", { name: "Fecha de vencimiento" });
    const deadlineTrigger = screen.getByRole("button", { name: "Fecha límite" });
    const priorityTrigger = screen.getByRole("button", { name: "P4 · Baja" });
    const labelsTrigger = screen.getByRole("button", { name: "Etiquetas de la tarea" });
    const remindersTrigger = screen.getByRole("button", { name: "Recordatorios" });
    const cancelButton = screen.getByRole("button", { name: "Cancelar" });
    const confirmButton = screen.getByRole("button", { name: "Agregar tarea" });

    expect(title).toHaveFocus();
    await user.tab();
    expect(destinationTrigger).toHaveFocus();
    await user.tab();
    expect(description).toHaveFocus();
    await user.tab();
    expect(dateTrigger).toHaveFocus();
    await user.tab();
    expect(deadlineTrigger).toHaveFocus();
    await user.tab();
    expect(priorityTrigger).toHaveFocus();
    await user.tab();
    expect(labelsTrigger).toHaveFocus();
    await user.tab();
    expect(remindersTrigger).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();
    await user.tab();
    expect(confirmButton).toHaveFocus();
  });

  it("en variant=\"full\", plegado, solo título y destino son alcanzables antes de desplegar (D-C)", async () => {
    const user = userEvent.setup();
    renderRow({ variant: "full" });

    const title = screen.getByLabelText("Título de la nueva tarea");
    const destinationTrigger = await screen.findByRole("button", { name: "Proyecto destino" });
    const expandButton = screen.getByRole("button", { name: "Mostrar más campos" });
    const cancelButton = screen.getByRole("button", { name: "Cancelar" });

    expect(title).toHaveFocus();
    await user.tab();
    expect(destinationTrigger).toHaveFocus();
    await user.tab();
    expect(expandButton).toHaveFocus();
    await user.tab();
    expect(cancelButton).toHaveFocus();
  });

  it("sin variant=\"full\" arranca colapsado, mostrando el botón 'Agregar tarea' (comportamiento sin cambios en listas y secciones)", () => {
    renderRow();

    expect(screen.getByRole("button", { name: "Agregar tarea" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Título de la nueva tarea")).not.toBeInTheDocument();
  });

  it("variant=\"full\" arranca ya desplegado (sin el botón \"Agregar tarea\" de más) y con el foco en el título, sin necesitar el clic extra (bloque 10.2)", () => {
    renderRow({ variant: "full" });

    const title = screen.getByLabelText("Título de la nueva tarea");
    expect(title).toBeInTheDocument();
    expect(title).toHaveFocus();
  });

  it("variant=\"full\" arranca plegado: solo título y destino, nada más, hasta usar el control de desplegar (D-C)", async () => {
    renderRow({ variant: "full" });

    expect(screen.getByLabelText("Título de la nueva tarea")).toBeInTheDocument();
    await screen.findByRole("button", { name: "Proyecto destino" });
    expect(screen.queryByLabelText("Descripción de la nueva tarea")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Fecha de vencimiento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Etiquetas de la tarea" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recordatorios" })).not.toBeInTheDocument();
  });

  it("desplegar el modal global muestra el resto de los campos (D-C)", async () => {
    const user = userEvent.setup();
    renderRow({ variant: "full" });

    await user.click(screen.getByRole("button", { name: "Mostrar más campos" }));

    expect(screen.getByLabelText("Descripción de la nueva tarea")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fecha de vencimiento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fecha límite" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "P4 · Baja" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Etiquetas de la tarea" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recordatorios" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mostrar más campos" })).not.toBeInTheDocument();
  });

  it("elegir una etiqueta del selector le gana a lo detectado por @ en el título (D-E)", async () => {
    const user = userEvent.setup();
    renderRow({ variant: "full" });

    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar leche @personal ");
    await user.click(screen.getByRole("button", { name: "Mostrar más campos" }));
    await user.click(screen.getByRole("button", { name: "Etiquetas de la tarea" }));
    await user.click(await screen.findByRole("option", { name: "casa" }));

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    await waitFor(() => expect(insertedTask()).toBeDefined());
    const taskLabelInsert = mock.insertCalls.find((c) => c.table === "task_labels");
    expect(taskLabelInsert?.payload).toEqual([{ task_id: "new-task", label_id: "l1", user_id: "user-1" }]); // "casa" (l1), no "personal" (l2, detectada por @)
  });

  it("un recordatorio agregado en el alta se persiste junto con la tarea (D-E)", async () => {
    const user = userEvent.setup();
    renderRow({ variant: "full" });

    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar pan");
    await user.click(screen.getByRole("button", { name: "Mostrar más campos" }));
    await user.click(screen.getByRole("button", { name: "Recordatorios" }));
    fireEvent.change(screen.getByLabelText("Fecha y hora del recordatorio"), { target: { value: "2026-08-05T09:00" } });
    await user.click(screen.getByRole("button", { name: "Agregar recordatorio puntual" }));

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    await waitFor(() => expect(insertedTask()).toBeDefined());
    const reminders = insertedReminders();
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ task_id: "new-task", offset_minutes: null });
  });

  it("con defaultDueAt y defaultDurationMinutes (D-F, alta del calendario), la tarea se crea con esa hora y duración en una sola mutación", async () => {
    renderRow({ variant: "full", defaultDueAt: "2026-08-05T13:00:00.000Z", defaultDurationMinutes: 45 });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Reunión de equipo");
    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.due_at).toBe("2026-08-05T13:00:00.000Z");
    expect(insertedTask()!.duration_minutes).toBe(45);
    expect(insertedTask()!.due_date).toBeNull();
    expect(mock.insertCalls.filter((c) => c.table === "tasks")).toHaveLength(1); // una sola mutación, sin encadenar un update
  });

  it("con defaultDueDate (bloque 8.2, vista Hoy), la tarea se crea con esa fecha si el título no reconoce ninguna", async () => {
    const queryClient = new QueryClient();
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider preferences={TEST_PREFERENCES}>
          <TaskQuickAddRow projectId="p1" sectionId={null} parentId={null} defaultDueDate="2026-08-01" />
        </PreferencesProvider>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar pan");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.due_date).toBe("2026-08-01");
  });

  it("con defaultDueDate, una fecha que el parser reconoce en el título le gana al valor por defecto", async () => {
    // El reloj se congela (`vi.setSystemTime`) para que "mañana" resuelva
    // siempre al día siguiente de una fecha fija, nunca al 2026-08-01 del
    // `defaultDueDate` — si no, el test depende de en qué día corre.
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
    try {
      const queryClient = new QueryClient();
      const user = userEvent.setup();
      render(
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider preferences={TEST_PREFERENCES}>
            <TaskQuickAddRow projectId="p1" sectionId={null} parentId={null} defaultDueDate="2026-08-01" />
          </PreferencesProvider>
        </QueryClientProvider>,
      );

      await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
      await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar pan mañana");
      await user.keyboard("{Enter}");

      await waitFor(() => expect(insertedTask()).toBeDefined());
      expect(insertedTask()!.due_date).not.toBeNull();
      expect(insertedTask()!.due_date).not.toBe("2026-08-01");
    } finally {
      vi.useRealTimers();
    }
  });

  it("una subtarea no muestra el selector de destino (D-D): hereda el proyecto de la tarea padre, no puede tener uno propio", async () => {
    const queryClient = new QueryClient();
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider preferences={TEST_PREFERENCES}>
          <TaskQuickAddRow projectId="p1" sectionId={null} parentId="task-parent" />
        </PreferencesProvider>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Agregar subtarea" }));
    expect(screen.queryByRole("button", { name: "Proyecto destino" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Título de la nueva subtarea"), "Una subtarea");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.parent_id).toBe("task-parent");
    expect(insertedTask()!.project_id).toBe("p1"); // heredado del padre, sin selector visible
  });

  it("compact (dentro de una sección) conserva la descripción y también muestra el destino (D-D, revierte el ruido de fase 1)", async () => {
    const user = userEvent.setup();
    renderRow({ projectId: "p2", sectionId: "sec1" }); // default variant="compact"

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    expect(screen.getByLabelText("Descripción de la nueva tarea")).toBeInTheDocument();
    const destinationTrigger = await screen.findByRole("button", { name: "Proyecto destino" });
    await waitFor(() => expect(destinationTrigger).toHaveTextContent("En curso")); // "Trabajo · En curso" (p2/sec1)
  });

  it("la tarea creada desde el compacto de una sección cae en esa sección (bloque 7.3)", async () => {
    const user = userEvent.setup();
    renderRow({ projectId: "p2", sectionId: "sec1" });

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Revisar informe");
    await user.type(screen.getByLabelText("Descripción de la nueva tarea"), "Con más detalle");
    // Click al botón, no Enter: el foco está en la descripción y Enter ahí
    // agrega un salto de línea (multilínea, bloque 5.2), no somete el alta —
    // eso solo lo hace Enter con el foco en el título.
    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.project_id).toBe("p2");
    expect(insertedTask()!.section_id).toBe("sec1");
    expect(insertedTask()!.description).not.toBeNull(); // la descripción sí viajó (no se omite, solo el destino)
  });

  it("full y compact comparten el mismo reconocimiento del parser en vivo: es un solo componente, dos presentaciones (bloque 7.4)", async () => {
    const user = userEvent.setup();
    renderRow({ variant: "full" });

    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar pan mañana");

    await waitFor(() => {
      const marks = document.querySelectorAll("mark");
      expect(marks.length).toBe(1); // mismo resaltado en vivo que ya prueba el describe de arriba en compact
      expect(marks[0].textContent).toBe("mañana");
    });
  });
});

describe("TaskQuickAddRow — menús de # y @ (bloque 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.insertCalls.length = 0;
  });

  it("escribir #Trabajo de corrido, sin tocar el menú, reconoce el proyecto Trabajo", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Terminar informe #Trabajo ");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.title).toBe("Terminar informe");
    expect(insertedTask()!.project_id).toBe("p2");
  });

  it("elegir 'Trabajo' del menú de # da el mismo resultado que escribirlo de corrido", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Terminar informe #Trab");
    await user.click(await screen.findByRole("option", { name: "Trabajo" }));
    // Mismo texto que si se hubiera tipeado "#Trabajo " entero, no un estado paralelo.
    expect(input).toHaveValue("Terminar informe #Trabajo ");

    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.title).toBe("Terminar informe"); // idéntico al del test anterior
    expect(insertedTask()!.project_id).toBe("p2");
  });

  it("el menú nunca le roba el foco al campo de título, ni por mouse ni por teclado", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Nueva tarea #Trab");
    expect(input).toHaveFocus();

    await user.click(await screen.findByRole("option", { name: "Trabajo" }));
    expect(input).toHaveFocus(); // seguir en el campo también después de clickear una opción con el mouse
  });

  it("escribir texto normal con el menú abierto sigue llegando al título (no lo intercepta)", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Nueva tarea #Tra");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.type(input, "bajo urgente"); // sigue escribiendo sin mirar el menú
    expect(input).toHaveValue("Nueva tarea #Trabajo urgente");
  });

  it("el menú se puede ignorar por completo: Escape lo cierra sin tocar el texto ni cancelar el alta", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Nueva tarea #Trab");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("Nueva tarea #Trab"); // el texto no cambió
    expect(screen.getByLabelText("Título de la nueva tarea")).toBeInTheDocument(); // el alta sigue abierta, no se canceló
  });

  it("el menú se puede ignorar por completo: clic afuera lo cierra sin tocar el texto", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Nueva tarea #Trab");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(document.body);

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(input).toHaveValue("Nueva tarea #Trab");
  });

  it("el menú de # filtra a medida que se sigue escribiendo, sin distinguir mayúsculas ni acentos", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Archivar #BAND");

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["Bandeja de entrada"]);
  });

  it("el menú de # muestra las secciones anidadas debajo de su proyecto, y es navegable con flechas y Enter", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Reunión #Trab");

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["Trabajo", "En curso"]); // la sección, debajo de su proyecto

    await user.keyboard("{ArrowDown}{Enter}"); // baja a "En curso" y la confirma
    expect(input).toHaveValue("Reunión #Trabajo/En curso ");
  });

  it("el menú de @ filtra las etiquetas existentes sin distinguir mayúsculas ni acentos", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await user.type(screen.getByLabelText("Título de la nueva tarea"), "Comprar @CA");

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["casa"]);
  });

  it("el menú de @ ofrece crear la etiqueta que no existe, y elegirla la crea y la asigna igual que tipeando de corrido", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Comprar leche @nueva");

    const createOption = await screen.findByRole("option", { name: 'Crear etiqueta "nueva"' });
    await user.click(createOption);
    expect(input).toHaveValue("Comprar leche @nueva "); // mismo texto que tipeando "@nueva " entero

    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    expect(insertedTask()!.title).toBe("Comprar leche");
    const labelInsert = mock.insertCalls.find((c) => c.table === "labels");
    expect(labelInsert?.payload).toMatchObject({ name: "nueva" });
    const taskLabelInsert = mock.insertCalls.find((c) => c.table === "task_labels");
    expect(taskLabelInsert).toBeDefined();
  });

  it("el doble clic sigue desactivando un token elegido desde el menú, igual que uno tipeado de corrido (R7)", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.type(input, "Terminar informe #Trab");
    await user.click(await screen.findByRole("option", { name: "Trabajo" }));
    expect(input).toHaveValue("Terminar informe #Trabajo ");

    const mark = await waitFor(() => {
      const found = Array.from(document.querySelectorAll("mark")).find((m) => m.textContent === "#Trabajo");
      if (!found) throw new Error("todavía no se resaltó '#Trabajo'");
      return found;
    });
    fireEvent.doubleClick(mark);

    await waitFor(() => {
      expect(Array.from(document.querySelectorAll("mark")).some((m) => m.textContent === "#Trabajo")).toBe(false);
    });

    await user.keyboard("{Enter}");

    await waitFor(() => expect(insertedTask()).toBeDefined());
    // El token desactivado queda como texto común, símbolo incluido; y como
    // no se resolvió ningún proyecto, el destino es el de contexto (p1).
    expect(insertedTask()!.title).toBe("Terminar informe #Trabajo");
    expect(insertedTask()!.project_id).toBe("p1");
  });
});
