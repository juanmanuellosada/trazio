// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountMenu } from "./account-menu";
import { SettingsProvider, useSettings } from "@/components/settings/settings-context";

/**
 * Tests del menú de cuenta (bloque 10.3): que agrupe tema, Configuración y
 * cerrar sesión en un único desplegable (nada suelto fuera de él), que
 * "Configuración" abra el modal en vez de navegar, y que se navegue solo
 * con teclado — el resto (abrir con clic derecho, flechas, `Escape`) ya lo
 * prueba `@base-ui/react/menu`, no hace falta reprobarlo acá.
 */

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "system", setTheme: vi.fn() }) }));
vi.mock("@/lib/preferences/theme-action", () => ({ updateThemePreference: vi.fn() }));
vi.mock("@/lib/toast", () => ({ toastError: vi.fn() }));

const signOut = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut } }),
}));

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

function renderMenu(collapsed = false) {
  const queryClient = new QueryClient();
  const clearSpy = vi.spyOn(queryClient, "clear");
  let settings: ReturnType<typeof useSettings> | null = null;
  function CaptureSettings() {
    settings = useSettings();
    return null;
  }
  render(
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <CaptureSettings />
        <AccountMenu collapsed={collapsed} />
      </SettingsProvider>
    </QueryClientProvider>,
  );
  return { clearSpy, getSettings: () => settings! };
}

describe("AccountMenu", () => {
  beforeEach(() => {
    signOut.mockClear();
    push.mockReset();
    refresh.mockReset();
  });

  it("agrupa Tema, Configuración y cerrar sesión en un único menú, nada suelto afuera", async () => {
    const user = userEvent.setup();
    renderMenu();

    // Nada de esto existe todavía suelto en la pantalla, solo el disparador.
    expect(screen.queryByRole("menuitem", { name: "Configuración" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Cerrar sesión" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Menú de cuenta" }));

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Tema/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Configuración" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("Configuración abre el modal de configuración en vez de navegar", async () => {
    const user = userEvent.setup();
    const { getSettings } = renderMenu();

    await user.click(screen.getByRole("button", { name: "Menú de cuenta" }));

    const item = await screen.findByRole("menuitem", { name: "Configuración" });
    expect(item).not.toHaveAttribute("href");
    expect(getSettings().isOpen).toBe(false);

    await user.click(item);

    expect(getSettings().isOpen).toBe(true);
    expect(push).not.toHaveBeenCalled();
  });

  it("se navega solo con teclado: las flechas recorren las opciones y Enter activa cerrar sesión", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Menú de cuenta" }));
    await screen.findByRole("menu");

    // Tema, Configuración, Etiquetas, Filtros, Cerrar sesión: cinco pasos
    // hasta la última opción (el separador antes de "Cerrar sesión" no
    // cuenta como parada de la navegación por teclado).
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}");

    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
  });

  it("Etiquetas navega a la pantalla de administración de etiquetas", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Menú de cuenta" }));

    const item = await screen.findByRole("menuitem", { name: "Etiquetas" });
    expect(item).not.toHaveAttribute("href");

    await user.click(item);

    expect(push).toHaveBeenCalledWith("/etiquetas");
  });

  it("Filtros navega a la pantalla de administración de filtros", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Menú de cuenta" }));

    const item = await screen.findByRole("menuitem", { name: "Filtros" });
    expect(item).not.toHaveAttribute("href");

    await user.click(item);

    expect(push).toHaveBeenCalledWith("/filtros");
  });

  it("Escape cierra el menú sin ejecutar ninguna opción", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Menú de cuenta" }));
    await screen.findByRole("menu");

    await user.keyboard("{Escape}");

    expect(signOut).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
