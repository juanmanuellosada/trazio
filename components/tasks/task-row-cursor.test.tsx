// @vitest-environment jsdom
import { useState, type ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { ShortcutProvider } from "@/components/shortcuts/shortcut-provider";
import { ListCursorProvider } from "@/components/list-cursor/list-cursor-context";
import { SelectionProvider } from "@/components/selection/selection-context";
import { TaskDetailProvider, useTaskDetail } from "./task-detail-context";
import type { TaskRow as TaskRowData } from "@/lib/tasks/use-tasks";
import { TaskRow } from "./task-row";

/**
 * Bloques 3-5 (capacidad `cursor-de-lista`): roving tabindex, teclas del
 * cursor sobre la fila señalada, y su convivencia con la selección
 * múltiple. Monta `TaskRow` de verdad (no un doble) porque lo que se prueba
 * acá es exactamente su cableado — `role`/`tabIndex`, el `useShortcutScope`
 * por fila, y el foco real que dispara `ListCursorProvider`.
 */

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/shortcuts/global-quick-add-dialog", () => ({ GlobalQuickAddDialog: () => null }));
vi.mock("@/components/calendar/create-event-dialog", () => ({ CreateEventDialog: () => null }));
vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/lib/projects/use-projects", () => ({ useProjects: () => ({ data: [] }) }));
vi.mock("@/lib/sections/use-sections", () => ({
  useAllSections: () => ({ data: [] }),
  useSections: () => ({ data: [] }),
}));
vi.mock("@/lib/tasks/use-tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tasks/use-tasks")>();
  return { ...actual, useTasks: () => ({ data: [] }) };
});

const updateTaskMutate = vi.fn();
const deleteTaskMutate = vi.fn();
vi.mock("@/lib/tasks/mutations", () => ({
  useUpdateTask: () => ({ mutate: updateTaskMutate }),
  useMoveTask: () => ({ mutate: vi.fn() }),
  useDuplicateTask: () => ({ mutate: vi.fn() }),
  useDeleteTask: () => ({ mutate: deleteTaskMutate }),
}));

const TEST_PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

function task(overrides: Partial<TaskRowData> & { id: string; title: string }): TaskRowData {
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

const TASKS = [
  task({ id: "a", title: "Tarea A" }),
  task({ id: "b", title: "Tarea B" }),
  task({ id: "c", title: "Tarea C" }),
];

function DetailOpener() {
  const { openTaskId, close } = useTaskDetail();
  if (!openTaskId) return null;
  return (
    <div role="dialog" aria-label="Detalle">
      Detalle de {openTaskId}
      <button type="button" onClick={close}>
        Cerrar
      </button>
    </div>
  );
}

function List({ tasks = TASKS, orderedIds }: { tasks?: TaskRowData[]; orderedIds?: string[] }) {
  const ids = orderedIds ?? tasks.map((t) => t.id);
  return (
    <ListCursorProvider orderedIds={ids}>
      <div role="listbox" aria-label="Tareas">
        <ul>
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              allTasks={tasks}
              siblings={[]}
              depth={0}
              variant="flat"
              selectionOrderIds={ids}
            />
          ))}
        </ul>
      </div>
      <DetailOpener />
    </ListCursorProvider>
  );
}

function renderList(ui: ReactElement) {
  return render(
    <PreferencesProvider preferences={TEST_PREFERENCES}>
      <TaskDetailProvider>
        <ShortcutProvider inboxProjectId={null}>
          <SelectionProvider>{ui}</SelectionProvider>
        </ShortcutProvider>
      </TaskDetailProvider>
    </PreferencesProvider>,
  );
}

function rowFor(title: string): HTMLElement {
  return screen.getByText(title).closest('[role="option"]') as HTMLElement;
}

beforeEach(() => {
  updateTaskMutate.mockClear();
  deleteTaskMutate.mockClear();
});

describe("TaskRow + ListCursorProvider — roving tabindex (bloque 3)", () => {
  it("sin cursor, la primera fila es el único tab-stop (D-A, D-G)", () => {
    renderList(<List />);
    expect(rowFor("Tarea A")).toHaveAttribute("tabindex", "0");
    expect(rowFor("Tarea B")).toHaveAttribute("tabindex", "-1");
    expect(rowFor("Tarea C")).toHaveAttribute("tabindex", "-1");
  });

  it("cada fila tiene role=option", () => {
    renderList(<List />);
    expect(rowFor("Tarea A")).toHaveAttribute("role", "option");
  });

  it("clic en una fila la señala y le da el foco real", () => {
    renderList(<List />);
    fireEvent.click(screen.getByText("Tarea B"));
    expect(rowFor("Tarea B")).toHaveAttribute("tabindex", "0");
    expect(rowFor("Tarea B")).toHaveFocus();
  });

  it("↓ mueve el cursor y el foco real a la fila siguiente", () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(rowFor("Tarea B")).toHaveFocus();
    expect(rowFor("Tarea B")).toHaveAttribute("tabindex", "0");
    expect(rowFor("Tarea A")).toHaveAttribute("tabindex", "-1");
  });

  it("Fin va a la última fila", () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    fireEvent.keyDown(window, { key: "End" });
    expect(rowFor("Tarea C")).toHaveFocus();
  });
});

describe("TaskRow — Enter y Espacio sobre la fila señalada (bloque 4)", () => {
  it("Enter abre el detalle de la fila señalada", () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea B"));
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("dialog")).toHaveTextContent("Detalle de b");
  });

  it("Espacio completa la tarea señalada y nunca desplaza la página (4.2, el bug clásico)", () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    const notCanceled = fireEvent.keyDown(window, { key: " " });
    expect(notCanceled).toBe(false); // `fireEvent` devuelve `false` cuando `preventDefault()` se llamó.
    expect(updateTaskMutate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a", patch: expect.objectContaining({ completed_at: expect.any(String) }) }),
    );
  });

  it("Espacio en el alta rápida en línea escribe un espacio, nunca completa una tarea (D-F)", () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: " " });
    expect(updateTaskMutate).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });
});

describe("TaskRow — el menú de la fila señalada (bloque 4.4/4.5)", () => {
  it("'.' abre el menú de acciones de la fila señalada", async () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    fireEvent.keyDown(window, { key: "." });
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Eliminar" })).toBeInTheDocument());
  });

  it("cerrar el menú con Escape devuelve el foco a la fila", async () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    fireEvent.keyDown(window, { key: "." });
    const menuItem = await screen.findByRole("menuitem", { name: "Eliminar" });
    // Disparado sobre el propio ítem del menú (no sobre `window`, como el
    // resto de las pruebas de este archivo): en un teclado real, `Escape`
    // sale desde lo que tiene foco dentro del menú y burbujea a través de
    // `document` — donde Base UI escucha su propio cierre por `Escape` —
    // antes de llegar a `window`. Disparar directo en `window` (como hace
    // nuestro propio listener global) salta ese paso y nunca prueba el
    // cierre real del menú.
    fireEvent.keyDown(menuItem, { key: "Escape" });
    await waitFor(() => expect(rowFor("Tarea A")).toHaveFocus());
  });

  it("con el menú de la fila abierto, ↓ no mueve el cursor de la lista", async () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    fireEvent.keyDown(window, { key: "." });
    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Eliminar" })).toBeInTheDocument());
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(rowFor("Tarea A")).toHaveAttribute("tabindex", "0");
    expect(rowFor("Tarea B")).toHaveAttribute("tabindex", "-1");
  });
});

describe("TaskRow — el detalle abierto gana sobre el cursor (bloque 4.4)", () => {
  it("con el detalle abierto, ↓ nunca mueve el cursor de la lista de atrás", () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    fireEvent.keyDown(window, { key: "Enter" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(rowFor("Tarea A")).toHaveAttribute("tabindex", "0");
    expect(rowFor("Tarea B")).toHaveAttribute("tabindex", "-1");
  });

  it("con el detalle abierto, Espacio no completa la fila de atrás", () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    fireEvent.keyDown(window, { key: "Enter" });
    updateTaskMutate.mockClear();
    fireEvent.keyDown(window, { key: " " });
    expect(updateTaskMutate).not.toHaveBeenCalled();
  });
});

describe("TaskRow — selección múltiple por teclado (bloque 5)", () => {
  it("X selecciona la fila señalada", () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    fireEvent.keyDown(window, { key: "x" });
    expect(screen.getByLabelText("Quitar Tarea A de la selección")).toBeInTheDocument();
  });

  it("⇧↓ mueve el cursor y extiende la selección con el mismo ancla que ⇧clic (D-E)", () => {
    renderList(<List />);
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea A"));
    fireEvent.keyDown(window, { key: "ArrowDown", shiftKey: true });
    expect(rowFor("Tarea B")).toHaveFocus();
    expect(screen.getByLabelText("Quitar Tarea A de la selección")).toBeInTheDocument();
    expect(screen.getByLabelText("Quitar Tarea B de la selección")).toBeInTheDocument();
    expect(screen.getByLabelText("Seleccionar Tarea C")).toBeInTheDocument();
  });

  it("un clic en el casillero y un ⇧↓ posterior calculan el rango desde el mismo ancla que un ⇧clic", () => {
    renderList(<List />);
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea A"));
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea C"), { shiftKey: true });
    expect(screen.getByLabelText("Quitar Tarea A de la selección")).toBeInTheDocument();
    expect(screen.getByLabelText("Quitar Tarea B de la selección")).toBeInTheDocument();
    expect(screen.getByLabelText("Quitar Tarea C de la selección")).toBeInTheDocument();
  });

  it("Escape vacía la selección y deja el cursor donde estaba (5.4)", () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea B"));
    fireEvent.keyDown(window, { key: "x" });
    expect(screen.getByLabelText("Quitar Tarea B de la selección")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByLabelText("Seleccionar Tarea B")).toBeInTheDocument();
    expect(rowFor("Tarea B")).toHaveFocus();
  });
});

describe("TaskRow — tratamiento visual (bloque 6)", () => {
  it("una fila señalada y seleccionada a la vez muestra los dos tratamientos (6.1/6.2)", () => {
    renderList(<List />);
    fireEvent.focus(rowFor("Tarea A"));
    fireEvent.keyDown(window, { key: "x" });
    // Buscado por el ancestro con las clases visuales reales, no por
    // `role="option"` (ese es el `<li>`; las clases de tratamiento visual
    // viven en el `<div>` de contenido, ver el comentario en `task-row.tsx`).
    const visualRow = screen.getByLabelText("Quitar Tarea A de la selección").closest("div")!;
    expect(visualRow.className).toContain("bg-primary/10"); // selección: fondo
    expect(visualRow.className).toContain("ring-2 ring-inset ring-primary/50"); // cursor: anillo
  });

  it("una fila solo seleccionada (sin ser la señalada) no muestra el anillo del cursor", () => {
    renderList(<List />);
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea A"));
    fireEvent.focus(rowFor("Tarea B"));
    const visualRowA = screen.getByLabelText("Quitar Tarea A de la selección").closest("div")!;
    expect(visualRowA.className).toContain("bg-primary/10");
    expect(visualRowA.className).not.toContain("ring-2 ring-inset ring-primary/50");
  });
});

function ReconcilingList() {
  const [ids, setIds] = useState(["a", "b", "c"]);
  const visible = TASKS.filter((t) => ids.includes(t.id));
  return (
    <ListCursorProvider orderedIds={ids}>
      <div role="listbox" aria-label="Tareas">
        <ul>
          {visible.map((t) => (
            <TaskRow key={t.id} task={t} allTasks={visible} siblings={[]} depth={0} variant="flat" selectionOrderIds={ids} />
          ))}
        </ul>
      </div>
      <button type="button" onClick={() => setIds((prev) => prev.filter((id) => id !== "a"))}>
        completar a
      </button>
    </ListCursorProvider>
  );
}

describe("TaskRow — el cursor sobrevive a que la lista cambie debajo (D-C)", () => {
  it("sacar la fila señalada de la lista (completar) deja el cursor en la fila que ocupó su lugar", () => {
    renderList(<ReconcilingList />);
    fireEvent.focus(rowFor("Tarea A"));
    fireEvent.click(screen.getByText("completar a"));
    expect(rowFor("Tarea B")).toHaveFocus();
  });
});
