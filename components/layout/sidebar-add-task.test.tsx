// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import * as supabaseClientModule from "@/lib/supabase/client";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import { ComposeContextProvider } from "@/components/tasks/compose-context";
import { SidebarAddTask } from "./sidebar-add-task";

/**
 * Tests del acceso directo de alta del panel lateral (bloque 10.2, ahora
 * `GlobalQuickAddDialog` compartido con el atajo `Q` —
 * `alta-de-tareas-en-contexto`): que el botón monte ese diálogo, sin una
 * segunda implementación acá. El contrato del parser, el plegado y el resto
 * del comportamiento del composer ya los prueba `task-quick-add-row.test.tsx`
 * y `global-quick-add-dialog.test.tsx`; acá solo lo que agrega este acceso:
 * el montaje desde el panel.
 */

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
    then: (resolve: (value: unknown) => void) => {
      setTimeout(() => resolve(result), 0);
    },
  };
  return self;
}

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
(supabaseClientModule.createClient as ReturnType<typeof vi.fn>).mockImplementation(() => ({
  from: vi.fn(() => chain({ data: [], error: null })),
}));

function renderAddTask(inboxProjectId: string | null = "inbox-1") {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider preferences={TEST_PREFERENCES}>
        <ComposeContextProvider>
          <SidebarAddTask collapsed={false} inboxProjectId={inboxProjectId} />
        </ComposeContextProvider>
      </PreferencesProvider>
    </QueryClientProvider>,
  );
}

describe("SidebarAddTask", () => {
  it("el botón abre un diálogo que monta el componente de alta, con foco en el título", async () => {
    const user = userEvent.setup();
    renderAddTask();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    const dialog = await screen.findByRole("dialog", { name: "Nueva tarea" });
    const title = within(dialog).getByLabelText("Título de la nueva tarea");
    expect(title).toBeInTheDocument();
    expect(title).toHaveFocus();
  });

  it("el modal abre plegado (D-C): título y destino nada más, hasta desplegar", async () => {
    const user = userEvent.setup();
    renderAddTask();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));

    const dialog = await screen.findByRole("dialog", { name: "Nueva tarea" });
    expect(await within(dialog).findByRole("button", { name: "Proyecto destino" })).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Descripción de la nueva tarea")).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Mostrar más campos" }));
    expect(within(dialog).getByLabelText("Descripción de la nueva tarea")).toBeInTheDocument();
  });

  it("cancelar cierra el diálogo en vez de dejarlo abierto sin formulario (bloque 7.2)", async () => {
    const user = userEvent.setup();
    renderAddTask();

    await user.click(screen.getByRole("button", { name: "Agregar tarea" }));
    await screen.findByRole("dialog", { name: "Nueva tarea" });

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sin Bandeja de entrada resuelta, el botón queda deshabilitado en vez de abrir un diálogo roto", () => {
    renderAddTask(null);

    expect(screen.getByRole("button", { name: "Agregar tarea" })).toBeDisabled();
  });
});
