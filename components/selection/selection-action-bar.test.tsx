// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { SelectionCheckbox } from "./selection-checkbox";
import { SelectionActionBar } from "./selection-action-bar";
import { SelectionProvider } from "./selection-context";
import type { BulkTaskRef } from "@/lib/tasks/mutations";

const mutateBulkDelete = vi.fn();
const mutateBulkMove = vi.fn();
const mutateBulkUpdate = vi.fn();
const mutateBulkAddLabels = vi.fn();

vi.mock("@/lib/tasks/mutations", () => ({
  useBulkDeleteTasks: () => ({ mutate: mutateBulkDelete }),
  useBulkMoveTasks: () => ({ mutate: mutateBulkMove }),
  useBulkUpdateTasks: () => ({ mutate: mutateBulkUpdate }),
  useBulkAddLabels: () => ({ mutate: mutateBulkAddLabels }),
  useReplaceTaskLabels: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/lib/labels/use-labels", () => ({
  useLabels: () => ({ data: [] }),
}));

vi.mock("@/lib/parser/use-parser-context", () => ({
  useParserContext: () => ({ proyectos: [], etiquetas: [] }),
}));

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
  defaultProjectId: null,
};

const ORDERED_IDS = ["a", "b", "c"];
const CANDIDATE_TASKS: BulkTaskRef[] = ORDERED_IDS.map((id) => ({ id, projectId: "p1" }));

function Screen() {
  return (
    <>
      <ul>
        {ORDERED_IDS.map((id) => (
          <li key={id}>
            <SelectionCheckbox taskId={id} taskTitle={`Tarea ${id}`} orderedIds={ORDERED_IDS} />
          </li>
        ))}
      </ul>
      <SelectionActionBar candidateTasks={CANDIDATE_TASKS} />
    </>
  );
}

function renderScreen() {
  return render(
    <PreferencesProvider preferences={TEST_PREFERENCES}>
      <SelectionProvider>
        <Screen />
      </SelectionProvider>
    </PreferencesProvider>,
  );
}

describe("SelectionActionBar — acciones en lote (bloque 7.11)", () => {
  // Regresión: después de eliminar en lote, el modo de selección seguía
  // activo con ids que ya no existen. Eliminar es distinta de mover/cambiar
  // prioridad/cambiar fecha: las tareas seleccionadas dejan de existir, así
  // que no tiene sentido seguir "seleccionadas" — a diferencia de esas otras
  // acciones, que sí dejan la selección para poder encadenar más de una.
  it("eliminar en lote sale del modo de selección", () => {
    renderScreen();

    fireEvent.click(screen.getByLabelText("Seleccionar Tarea a"));
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea b"));
    expect(screen.getByRole("toolbar", { name: "Acciones en lote" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Eliminar/ }));

    expect(mutateBulkDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("toolbar", { name: "Acciones en lote" })).not.toBeInTheDocument();
  });

  it("mover, cambiar prioridad y cambiar fecha mantienen la selección para encadenar otra acción", () => {
    renderScreen();

    fireEvent.click(screen.getByLabelText("Seleccionar Tarea a"));
    fireEvent.click(screen.getByLabelText("Seleccionar Tarea b"));

    fireEvent.click(screen.getByRole("button", { name: "Prioridad" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "P1 · Urgente" }));
    expect(mutateBulkUpdate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("toolbar", { name: "Acciones en lote" })).toBeInTheDocument();

    // "Hoy"/"Mañana"/"Sin fecha" viven detrás del menú "Más" (D-D de
    // `seleccion-con-ctrl`): hay que abrirlo antes de encontrar el ítem.
    fireEvent.click(screen.getByRole("button", { name: "Más acciones en lote" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Hoy" }));
    expect(mutateBulkUpdate).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("toolbar", { name: "Acciones en lote" })).toBeInTheDocument();
  });
});
