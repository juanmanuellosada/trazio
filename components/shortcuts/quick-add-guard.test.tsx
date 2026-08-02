// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { UndoProvider, useUndoStack } from "@/components/providers/undo-provider";
import { TaskQuickAddRow } from "@/components/tasks/task-quick-add-row";
import { ShortcutProvider } from "./shortcut-provider";

/**
 * Tarea 7.14: prueba de verdad, sobre el componente real del alta rápida
 * (`TaskQuickAddRow`), que ningún atajo se dispara mientras se escribe ahí
 * — y que `Ctrl/Cmd+Z` sí, tal como pide el requirement "Ningún atajo se
 * dispara con el foco en un campo de texto, salvo deshacer".
 */

vi.mock("@/lib/toast", () => ({ toastError: vi.fn(), toastSuccess: vi.fn() }));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("./global-quick-add-dialog", () => ({
  GlobalQuickAddDialog: ({ open }: { open: boolean }) => (open ? <p>Nueva tarea (global)</p> : null),
}));

const TEST_PREFERENCES = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy" as const,
  timeFormat: 24 as const,
  weekStartsOn: 1 as const,
  defaultProjectId: null,
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

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
(supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
  from: vi.fn(() => ({ select: vi.fn(() => chain({ data: [], error: null })) })),
  auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1" } } } }) },
}));

function UndoButton({ onUndo }: { onUndo: () => void }) {
  const { push: pushUndo } = useUndoStack();
  return (
    <button type="button" onClick={() => pushUndo({ label: "Acción de prueba.", undo: onUndo })}>
      Empujar deshacer
    </button>
  );
}

function renderHarness(onUndo: () => void) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <UndoProvider>
          <ShortcutProvider inboxProjectId="p1">
            <UndoButton onUndo={onUndo} />
            <TaskQuickAddRow projectId="p1" sectionId={null} parentId={null} variant="full" />
          </ShortcutProvider>
        </UndoProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe("Ningún atajo se dispara escribiendo en el alta rápida (bloque 7.14)", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("Q, S y G no disparan nada: la letra se escribe en el título", async () => {
    const user = userEvent.setup();
    renderHarness(vi.fn());

    const input = screen.getByLabelText("Título de la nueva tarea");
    await user.click(input);
    await user.type(input, "qsg");

    expect(input).toHaveValue("qsg");
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByText("Nueva tarea (global)")).not.toBeInTheDocument();
  });

  it("Ctrl/Cmd+Z sí deshace, con el foco en el título del alta rápida", () => {
    const onUndo = vi.fn();
    renderHarness(onUndo);

    fireEvent.click(screen.getByText("Empujar deshacer"));

    const input = screen.getByLabelText("Título de la nueva tarea");
    input.focus();
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });

    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
