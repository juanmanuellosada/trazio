// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import type { UserPreferences } from "@/lib/preferences/get-user-preferences";
import { SidebarAddEvent } from "./sidebar-add-event";

/**
 * Tests del acceso "agregar evento" del panel lateral (bloque 7.6): que el
 * botón exista y abra `CreateEventDialog` (bloque 6.7/6.8, sin una segunda
 * implementación acá). El formulario en sí —calendarios, validación, alta—
 * ya lo prueba su propia suite; acá solo lo que agrega este acceso.
 */

const PREFERENCES: UserPreferences = {
  timezone: "America/Argentina/Buenos_Aires",
  dateFormat: "dd-MM-yyyy",
  timeFormat: 24,
  weekStartsOn: 1,
};

vi.mock("@/components/calendar/create-event-dialog", () => ({
  CreateEventDialog: ({ open }: { open: boolean }) => (open ? <p>Evento nuevo</p> : null),
}));

function renderAccess(collapsed = false) {
  return render(
    <PreferencesProvider preferences={PREFERENCES}>
      <SidebarAddEvent collapsed={collapsed} />
    </PreferencesProvider>,
  );
}

describe("SidebarAddEvent (bloque 7.6)", () => {
  it("muestra el botón 'Agregar evento' expandido", () => {
    renderAccess(false);
    expect(screen.getByRole("button", { name: "Agregar evento" })).toBeInTheDocument();
  });

  it("clic abre el alta de evento", async () => {
    const user = userEvent.setup();
    renderAccess(false);

    expect(screen.queryByText("Evento nuevo")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Agregar evento" }));
    expect(screen.getByText("Evento nuevo")).toBeInTheDocument();
  });

  it("colapsado, el botón sigue siendo accesible por su tooltip", async () => {
    const user = userEvent.setup();
    renderAccess(true);

    const button = screen.getByRole("button");
    await user.click(button);
    expect(screen.getByText("Evento nuevo")).toBeInTheDocument();
  });
});
