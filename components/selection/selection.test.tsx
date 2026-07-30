// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShortcutProvider } from "@/components/shortcuts/shortcut-provider";
import { SelectionCheckbox } from "./selection-checkbox";
import { SelectionProvider, useSelection } from "./selection-context";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/shortcuts/global-quick-add-dialog", () => ({
  GlobalQuickAddDialog: () => null,
}));

const ORDERED_IDS = ["a", "b", "c", "d", "e", "f", "g"];

function List() {
  return (
    <ul>
      {ORDERED_IDS.map((id) => (
        <li key={id}>
          <SelectionCheckbox taskId={id} taskTitle={`Tarea ${id}`} orderedIds={ORDERED_IDS} />
        </li>
      ))}
    </ul>
  );
}

function Bar() {
  const selection = useSelection();
  if (!selection?.active) return <p>inactivo</p>;
  return <p>{selection.count} seleccionadas</p>;
}

function renderList() {
  return render(
    <SelectionProvider>
      <List />
      <Bar />
    </SelectionProvider>,
  );
}

function renderListWithShortcuts() {
  return render(
    <ShortcutProvider inboxProjectId={null}>
      <SelectionProvider>
        <List />
        <Bar />
      </SelectionProvider>
    </ShortcutProvider>,
  );
}

describe("SelectionCheckbox + SelectionProvider (bloque 7.10)", () => {
  it("un clic activa el modo y selecciona esa tarea", () => {
    renderList();
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea a"));
    expect(screen.getByText("1 seleccionadas")).toBeInTheDocument();
  });

  it("Shift+clic entre la tercera y la séptima selecciona el rango completo", () => {
    renderList();
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea c"));
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea g"), { shiftKey: true });
    expect(screen.getByText("5 seleccionadas")).toBeInTheDocument();
  });

  it("deseleccionar la única tarea sale del modo automáticamente", () => {
    renderList();
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea a"));
    fireEvent.click(screen.getByLabelText("Quitar Tarea a de la selección"));
    expect(screen.getByText("inactivo")).toBeInTheDocument();
  });

  it("Escape sale del modo de selección y deselecciona todo (bloque 7.10, vía el sistema de atajos)", () => {
    renderListWithShortcuts();
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea a"));
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea b"), { shiftKey: false });
    expect(screen.getByText("2 seleccionadas")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByText("inactivo")).toBeInTheDocument();
  });
});
