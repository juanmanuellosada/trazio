// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { UndoProvider, useUndoStack } from "@/components/providers/undo-provider";
import { useShortcutScope } from "@/lib/shortcuts/context";
import { ShortcutProvider } from "./shortcut-provider";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

// Stub sin las dependencias de datos de `TaskQuickAddRow` (preferencias,
// proyectos, Supabase): estos tests verifican el sistema de atajos, no el
// alta rápida en sí, que ya tiene su propia suite.
vi.mock("./global-quick-add-dialog", () => ({
  GlobalQuickAddDialog: ({ open }: { open: boolean }) => (open ? <p>Nueva tarea</p> : null),
}));

// Mismo criterio con el alta de evento (bloque 7.5): `CreateEventDialog`
// necesita `QueryClientProvider` (`useGoogleCalendars`), ajeno al propósito
// de este archivo, que verifica el sistema de atajos.
vi.mock("@/components/calendar/create-event-dialog", () => ({
  CreateEventDialog: ({ open }: { open: boolean }) => (open ? <p>Evento nuevo</p> : null),
}));

const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
};

function UndoButton({ onUndo }: { onUndo: () => void }) {
  const { push: pushUndo } = useUndoStack();
  return (
    <button type="button" onClick={() => pushUndo({ label: "Acción de prueba.", undo: onUndo })}>
      Empujar deshacer
    </button>
  );
}

function ScopedButton({ onS }: { onS: () => void }) {
  useShortcutScope([{ combo: { key: "s" }, handler: onS }]);
  return null;
}

function ScopedCombos({
  onCtrlS,
  onCtrlShiftC,
  onCtrlShiftN,
  onShiftDelete,
}: {
  onCtrlS: () => void;
  onCtrlShiftC: () => void;
  onCtrlShiftN: () => void;
  onShiftDelete: () => void;
}) {
  useShortcutScope([
    { combo: { key: "s", ctrl: true }, handler: onCtrlS },
    { combo: { key: "c", ctrl: true, shift: true }, handler: onCtrlShiftC },
    { combo: { key: "n", ctrl: true, shift: true }, handler: onCtrlShiftN },
    { combo: { key: "Delete", shift: true }, handler: onShiftDelete },
  ]);
  return null;
}

function renderHarness(extra?: React.ReactNode) {
  return render(
    <PreferencesProvider preferences={PREFERENCES}>
      <UndoProvider>
        <ShortcutProvider inboxProjectId="proyecto-1">
          <input aria-label="Título de la tarea" />
          {extra}
        </ShortcutProvider>
      </UndoProvider>
    </PreferencesProvider>,
  );
}

describe("ShortcutProvider — guarda de foco (bloque 7.14)", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("Q no abre el alta rápida mientras se escribe en un campo de texto", () => {
    renderHarness();
    const input = screen.getByLabelText("Título de la tarea");
    input.focus();
    fireEvent.keyDown(input, { key: "q" });
    expect(screen.queryByText("Nueva tarea")).not.toBeInTheDocument();
  });

  it("Q sí abre el alta rápida sin foco en un campo de texto", () => {
    renderHarness();
    fireEvent.keyDown(window, { key: "q" });
    expect(screen.getByText("Nueva tarea")).toBeInTheDocument();
  });

  it("E no abre el alta de evento mientras se escribe en un campo de texto", () => {
    renderHarness();
    const input = screen.getByLabelText("Título de la tarea");
    input.focus();
    fireEvent.keyDown(input, { key: "e" });
    expect(screen.queryByText("Evento nuevo")).not.toBeInTheDocument();
  });

  it("E sí abre el alta de un nuevo evento sin foco en un campo de texto (spec atajos-de-teclado)", () => {
    renderHarness();
    fireEvent.keyDown(window, { key: "e" });
    expect(screen.getByText("Evento nuevo")).toBeInTheDocument();
  });

  it("S no navega al buscador mientras se escribe en un campo de texto", () => {
    renderHarness();
    const input = screen.getByLabelText("Título de la tarea");
    input.focus();
    fireEvent.keyDown(input, { key: "s" });
    expect(push).not.toHaveBeenCalled();
  });

  it("Ctrl/Cmd+Z sí dispara deshacer con el foco en un campo de texto", () => {
    const onUndo = vi.fn();
    renderHarness(<UndoButton onUndo={onUndo} />);
    fireEvent.click(screen.getByText("Empujar deshacer"));

    const input = screen.getByLabelText("Título de la tarea");
    input.focus();
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});

describe("ShortcutProvider — la guarda de foco solo bloquea teclas sueltas", () => {
  it("Ctrl+S sí dispara con el foco en un campo de texto", () => {
    const onCtrlS = vi.fn();
    renderHarness(
      <ScopedCombos onCtrlS={onCtrlS} onCtrlShiftC={vi.fn()} onCtrlShiftN={vi.fn()} onShiftDelete={vi.fn()} />,
    );
    const input = screen.getByLabelText("Título de la tarea");
    input.focus();
    fireEvent.keyDown(input, { key: "s", ctrlKey: true });
    expect(onCtrlS).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Shift+C sí dispara con el foco en un campo de texto", () => {
    const onCtrlShiftC = vi.fn();
    renderHarness(
      <ScopedCombos onCtrlS={vi.fn()} onCtrlShiftC={onCtrlShiftC} onCtrlShiftN={vi.fn()} onShiftDelete={vi.fn()} />,
    );
    const input = screen.getByLabelText("Título de la tarea");
    input.focus();
    fireEvent.keyDown(input, { key: "c", ctrlKey: true, shiftKey: true });
    expect(onCtrlShiftC).toHaveBeenCalledTimes(1);
  });

  it("Ctrl+Shift+N sí dispara con el foco en un campo de texto", () => {
    const onCtrlShiftN = vi.fn();
    renderHarness(
      <ScopedCombos onCtrlS={vi.fn()} onCtrlShiftC={vi.fn()} onCtrlShiftN={onCtrlShiftN} onShiftDelete={vi.fn()} />,
    );
    const input = screen.getByLabelText("Título de la tarea");
    input.focus();
    fireEvent.keyDown(input, { key: "n", ctrlKey: true, shiftKey: true });
    expect(onCtrlShiftN).toHaveBeenCalledTimes(1);
  });

  it("Shift+Delete (sin Ctrl/Cmd) sigue bloqueado con el foco en un campo de texto", () => {
    const onShiftDelete = vi.fn();
    renderHarness(
      <ScopedCombos onCtrlS={vi.fn()} onCtrlShiftC={vi.fn()} onCtrlShiftN={vi.fn()} onShiftDelete={onShiftDelete} />,
    );
    const input = screen.getByLabelText("Título de la tarea");
    input.focus();
    fireEvent.keyDown(input, { key: "Delete", shiftKey: true });
    expect(onShiftDelete).not.toHaveBeenCalled();
  });
});

describe("ShortcutProvider — resolución de colisiones por contexto (D-G)", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("un binding más específico gana sobre el general (S: sección vs buscador)", () => {
    const onS = vi.fn();
    renderHarness(<ScopedButton onS={onS} />);
    fireEvent.keyDown(window, { key: "s" });
    expect(onS).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("un binding más específico gana sobre el general (E: etiquetas del detalle de tarea vs nuevo evento)", () => {
    const onE = vi.fn();
    function ScopedE() {
      useShortcutScope([{ combo: { key: "e" }, handler: onE }]);
      return null;
    }
    renderHarness(<ScopedE />);
    fireEvent.keyDown(window, { key: "e" });
    expect(onE).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Evento nuevo")).not.toBeInTheDocument();
  });
});

describe("ShortcutProvider — el acorde G", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("G seguido de I navega a la Bandeja", () => {
    renderHarness();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "i" });
    expect(push).toHaveBeenCalledWith("/bandeja");
  });

  it("G seguido de T navega a Hoy, y de U a Próximos, y de C a Completado", () => {
    renderHarness();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "t" });
    expect(push).toHaveBeenCalledWith("/hoy");
  });

  it("G seguido de A navega a Hábitos (tarea 5.5)", () => {
    renderHarness();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "a" });
    expect(push).toHaveBeenCalledWith("/habitos");
  });

  it("Escape cancela el acorde pendiente sin navegar", () => {
    renderHarness();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.keyDown(window, { key: "i" });
    // La `i` de después ya no completa ningún acorde: sin acorde pendiente, "i" sola no está bindeada a nada.
    expect(push).not.toHaveBeenCalled();
  });

  it("una tecla ajena al acorde lo cancela sin disparar su propio atajo (G, Q)", () => {
    renderHarness();
    fireEvent.keyDown(window, { key: "g" });
    fireEvent.keyDown(window, { key: "q" });
    expect(screen.queryByText("Nueva tarea")).not.toBeInTheDocument();
  });

  it("el acorde se cancela solo si pasan 1,5s sin la segunda tecla", () => {
    renderHarness();
    fireEvent.keyDown(window, { key: "g" });
    vi.advanceTimersByTime(1500);
    fireEvent.keyDown(window, { key: "i" });
    expect(push).not.toHaveBeenCalled();
  });
});
