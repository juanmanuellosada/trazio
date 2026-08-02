// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { TaskDetailProvider } from "@/components/tasks/task-detail-context";
import { ShortcutProvider } from "@/components/shortcuts/shortcut-provider";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { UndoProvider } from "@/components/providers/undo-provider";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/components/shortcuts/global-quick-add-dialog", () => ({ GlobalQuickAddDialog: () => null }));
vi.mock("@/components/calendar/create-event-dialog", () => ({ CreateEventDialog: () => null }));

// Cadena de Supabase genérica: todos los métodos de filtrado/orden
// devuelven la misma instancia (self), y `then` resuelve siempre vacío —
// este test verifica el atajo del teclado dentro de la paleta (bloque 2.7),
// no el comportamiento de la búsqueda en sí (que ya prueba
// `supabase/tests/search.test.ts`).
function chain() {
  const self: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "textSearch", "in"]) {
    self[method] = vi.fn(() => self);
  }
  self.then = (resolve: (value: unknown) => void) => {
    resolve({ data: [], error: null });
  };
  return self;
}

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
(supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
  from: vi.fn(() => chain()),
}));

const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
  defaultProjectId: null,
};

function renderApp() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={PREFERENCES}>
        <UndoProvider>
          <TaskDetailProvider>
            <ShortcutProvider inboxProjectId="inbox">
              <p>Vista de fondo</p>
            </ShortcutProvider>
          </TaskDetailProvider>
        </UndoProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe("SearchPalette — escribir en la paleta no dispara atajos globales (bloque 2.7)", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("S abre la paleta (en vez de navegar a /buscar)", () => {
    renderApp();
    fireEvent.keyDown(window, { key: "s" });
    expect(screen.getByRole("dialog", { name: "Buscar" })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("escribir «hoy» en el campo queda en el campo y no navega a ninguna ruta del acorde", async () => {
    renderApp();
    fireEvent.keyDown(window, { key: "s" });

    const input = screen.getByLabelText("Buscar tareas");
    fireEvent.change(input, { target: { value: "hoy" } });

    await waitFor(() => expect(input).toHaveValue("hoy"));
    expect(push).not.toHaveBeenCalled();
  });

  it("Escape cierra la paleta y la vista de fondo sigue montada (D-A: no se pierde la vista)", () => {
    renderApp();
    fireEvent.keyDown(window, { key: "s" });
    expect(screen.getByRole("dialog", { name: "Buscar" })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByLabelText("Buscar tareas"), { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Buscar" })).not.toBeInTheDocument();
    expect(screen.getByText("Vista de fondo")).toBeInTheDocument();
  });
});
