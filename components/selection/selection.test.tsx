// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { ShortcutProvider } from "@/components/shortcuts/shortcut-provider";
import { SelectionCheckbox } from "./selection-checkbox";
import { SelectionProvider, useSelection } from "./selection-context";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/shortcuts/global-quick-add-dialog", () => ({
  GlobalQuickAddDialog: () => null,
}));
// El atajo `E` (bloque 7.5) monta `CreateEventDialog`, que necesita
// `QueryClientProvider` (`useGoogleCalendars`) — ajeno al propósito de este
// archivo, que prueba selección múltiple, no el alta de eventos.
vi.mock("@/components/calendar/create-event-dialog", () => ({
  CreateEventDialog: () => null,
}));

const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

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
    <PreferencesProvider preferences={PREFERENCES}>
      <ShortcutProvider inboxProjectId={null}>
        <SelectionProvider>
          <List />
          <Bar />
        </SelectionProvider>
      </ShortcutProvider>
    </PreferencesProvider>,
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
